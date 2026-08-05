import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import PrimaryActionButton from "@/components/ui/primary-action-button";
import { Menu } from "lucide-react";
import CircleDashboardCard, { type CircleHighlight, type CircleMemberPreview } from "@/components/cards/CircleDashboardCard";
import { CircleCardSkeleton } from "@/components/cards/CardSkeletons";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { toast } from "sonner";
import { Typography } from "@/components/ui/typography";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";

interface Circle {
  id: string;
  name: string;
}

interface CircleView extends Circle {
  primary: CircleHighlight | null;
  supporting: CircleHighlight[];
  remaining: number;
  members: CircleMemberPreview[];
  lastActivity: number;
}

interface SharedItem {
  id: string;
  kind: "update" | "tip" | "meeting";
  title: string;
  created_at: string;
  circleNames: string[];
}

/**
 * HomePage (Hem) — the signed-in user's private start page.
 *
 * ARCHITECTURE: Minby has no visitable profiles and no global feed. There is
 * exactly one home and it always belongs to the authenticated user.
 * Circles are the hub: they dominate this page visually.
 */
const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<CircleView[]>([]);
  const [shared, setShared] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({
    display_name: null,
    avatar_url: null,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: circleRows, error }] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("circles").select("id, name"),
      ]);
      if (p) setProfile(p);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const list = (circleRows ?? []) as Circle[];
      const nameById = new Map(list.map((c) => [c.id, c.name]));

      const [
        { data: memberRows },
        { data: meetingRows },
        { data: messageRows },
        { data: photoVis },
        { data: tipVis },
        { data: pollRows },
      ] = await Promise.all([
        supabase.from("circle_members").select("circle_id, user_id"),
        supabase.from("meetings").select("id, title, meeting_date, circle_id, created_by, created_at"),
        supabase.from("messages").select("circle_id, created_at, user_id").order("created_at", { ascending: false }).limit(300),
        supabase.from("photo_visibility").select("circle_id, photos(id, caption, created_at, owner_id)"),
        supabase.from("tip_visibility").select("circle_id, tips(id, title, created_at, owner_id)"),
        supabase.from("polls").select("id, question, circle_id, created_by, created_at, closed"),
      ]);

      // Member avatars per circle
      const memberIds = Array.from(new Set((memberRows ?? []).map((m) => m.user_id)));
      const { data: profs } = memberIds.length
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", memberIds)
        : { data: [] as CircleMemberPreview[] };
      const profById = new Map((profs ?? []).map((pr) => [pr.user_id, pr as CircleMemberPreview]));
      const firstNameOf = (id: string | null | undefined) =>
        (profById.get(id ?? "")?.display_name ?? "").trim().split(" ")[0] || "Någon";

      const today = new Date().toISOString().slice(0, 10);

      const views: CircleView[] = list.map((c) => {
        const members = (memberRows ?? [])
          .filter((m) => m.circle_id === c.id)
          .map((m) => profById.get(m.user_id))
          .filter(Boolean) as CircleMemberPreview[];

        /**
         * Events are concrete and human. `weight` decides what becomes the
         * primary line — the thing most likely to make someone open the circle.
         */
        type Event = { primaryText: string; shortText: string; ts: number; weight: number };
        const events: Event[] = [];
        const at = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

        // Upcoming meeting — the strongest reason to open a circle
        const upcoming = (meetingRows ?? [])
          .filter((m) => m.circle_id === c.id && m.meeting_date && m.meeting_date >= today)
          .sort((a, b) => (a.meeting_date! < b.meeting_date! ? -1 : 1))[0];
        if (upcoming) {
          events.push({
            primaryText: upcoming.title,
            shortText: `${formatMeetingDate(upcoming.meeting_date)} · ${upcoming.title}`,
            ts: at(upcoming.created_at),
            weight: 4,
          });
        }

        // Open poll
        const poll = (pollRows ?? [])
          .filter((p: any) => p.circle_id === c.id && !p.closed)
          .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))[0];
        if (poll) {
          events.push({
            primaryText: `${firstNameOf(poll.created_by)} skapade en omröstning`,
            shortText: "Svara på en omröstning",
            ts: at(poll.created_at),
            weight: 3,
          });
        }

        // Tips
        const tips = (tipVis ?? [])
          .filter((tv: any) => tv.circle_id === c.id && tv.tips)
          .map((tv: any) => tv.tips)
          .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
        if (tips.length) {
          events.push({
            primaryText: `${firstNameOf(tips[0].owner_id)} delade ett tips`,
            shortText: tips.length === 1 ? "Läs ett nytt tips" : `Läs ${countWord(tips.length)} nya tips`,
            ts: at(tips[0].created_at),
            weight: 2,
          });
        }

        // Photos
        const photos = (photoVis ?? [])
          .filter((pv: any) => pv.circle_id === c.id && pv.photos)
          .map((pv: any) => pv.photos)
          .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
        if (photos.length) {
          events.push({
            primaryText:
              photos.length === 1
                ? `${firstNameOf(photos[0].owner_id)} delade ett foto`
                : `${firstNameOf(photos[0].owner_id)} delade ${countWord(photos.length)} foton`,
            shortText: photos.length === 1 ? "Se ett nytt foto" : `Se ${countWord(photos.length)} nya foton`,
            ts: at(photos[0].created_at),
            weight: 2,
          });
        }

        // Chat
        const msgs = (messageRows ?? []).filter((m) => m.circle_id === c.id);
        if (msgs.length) {
          events.push({
            primaryText: `${firstNameOf(msgs[0].user_id)} skrev i chatten`,
            shortText: msgs.length === 1 ? "Läs ett nytt meddelande" : "Läs vad som sagts i chatten",
            ts: at(msgs[0].created_at),
            weight: 1,
          });
        }

        const last = events.reduce((m, e) => Math.max(m, e.ts), 0);
        const ordered = [...events].sort((a, b) => b.weight - a.weight || b.ts - a.ts);
        const head = ordered[0];
        const rest = ordered.slice(1);

        return {
          ...c,
          members,
          primary: head ? { text: head.primaryText } : null,
          supporting: rest.slice(0, 2).map((e) => ({ text: e.shortText })),
          remaining: Math.max(0, rest.length - 2),
          lastActivity: last,
        };
      });

      views.sort((a, b) => b.lastActivity - a.lastActivity);
      setCircles(views);

      // "Jag har delat" — one shared chronological timeline of my own objects
      const circlesForPhoto = new Map<string, string[]>();
      (photoVis ?? []).forEach((pv: any) => {
        if (!pv.photos) return;
        const arr = circlesForPhoto.get(pv.photos.id) ?? [];
        const n = nameById.get(pv.circle_id);
        if (n) arr.push(n);
        circlesForPhoto.set(pv.photos.id, arr);
      });
      const circlesForTip = new Map<string, string[]>();
      (tipVis ?? []).forEach((tv: any) => {
        if (!tv.tips) return;
        const arr = circlesForTip.get(tv.tips.id) ?? [];
        const n = nameById.get(tv.circle_id);
        if (n) arr.push(n);
        circlesForTip.set(tv.tips.id, arr);
      });

      const seenPhoto = new Set<string>();
      const myPhotos: SharedItem[] = [];
      (photoVis ?? []).forEach((pv: any) => {
        const ph = pv.photos;
        if (!ph || ph.owner_id !== user.id || seenPhoto.has(ph.id)) return;
        seenPhoto.add(ph.id);
        myPhotos.push({
          id: ph.id,
          kind: "update",
          title: ph.caption || "En bild från vardagen",
          created_at: ph.created_at,
          circleNames: circlesForPhoto.get(ph.id) ?? [],
        });
      });

      const seenTip = new Set<string>();
      const myTips: SharedItem[] = [];
      (tipVis ?? []).forEach((tv: any) => {
        const tp = tv.tips;
        if (!tp || tp.owner_id !== user.id || seenTip.has(tp.id)) return;
        seenTip.add(tp.id);
        myTips.push({
          id: tp.id,
          kind: "tip",
          title: tp.title,
          created_at: tp.created_at,
          circleNames: circlesForTip.get(tp.id) ?? [],
        });
      });

      const myMeetings: SharedItem[] = (meetingRows ?? [])
        .filter((m) => m.created_by === user.id)
        .map((m) => ({
          id: m.id,
          kind: "meeting" as const,
          title: m.meeting_date ? `${formatMeetingDate(m.meeting_date)} · ${m.title}` : m.title,
          created_at: m.created_at,
          circleNames: [nameById.get(m.circle_id)].filter(Boolean) as string[],
        }));

      setShared(
        [...myPhotos, ...myTips, ...myMeetings].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );

      setLoading(false);
    })();
  }, [user]);

  const createCircle = async () => {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase
      .from("circles")
      .insert({ name: newName.trim(), created_by: user.id })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    setCreating(false);
    navigate(`/circle/${data.id}`);
  };

  const firstName = (profile.display_name ?? "").trim().split(" ")[0];
  const initials = (profile.display_name ?? user?.email ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-300 pt-safe pb-safe">
        <TopBar question="Var vill du hänga med ikväll?" hidden={scrolled} />

        <StickyHeader
          start={<FilterButton value={filter} onChange={setFilter} />}
          end={
            <ProfileButton
              profile={profile}
              expanded={menuOpen}
              onOpen={() => setMenuOpen(true)}
            />
          }
        />

        {/* Kretsar — the heart of the page */}
        <section className="pt-300">
          <CircleList
            circles={circles}
            loading={loading}
            onOpen={(id) => navigate(`/circle/${id}`)}
            emptyState={
              <div className="space-y-3">
                <Typography as="h3" variant="heading" className="text-foreground">
                  Inga kretsar än
                </Typography>
                <Typography as="p" variant="body" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                  Dina kretsar är där relationerna lever. Skapa din första och bjud in de du vill ha närmast.
                </Typography>
                <div className="pt-100">
                  <TextButton onClick={() => setCreating(true)}>Skapa en krets</TextButton>
                </div>
              </div>
            }
          />
        </section>

        {/* Jag har delat — one chronological timeline of my own objects */}
        <section className="mt-16 pb-32">
          <Typography as="h2" variant="heading" className="text-foreground mb-4">
            Jag har delat
          </Typography>

          {loading ? null : shared.length === 0 ? (
            <div className="space-y-3">
              <Typography as="h3" variant="heading" className="text-foreground">
                Inget delat än
              </Typography>
              <Typography as="p" variant="body" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                När du delar bilder, tips eller föreslår träffar i dina kretsar samlas allt här.
              </Typography>
              <Typography as="p" variant="body" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                Gå in i en krets för att dela något.
              </Typography>
            </div>
          ) : (
            <ul className="space-y-5">
              {shared.map((s) => (
                <li key={`${s.kind}-${s.id}`}>
                  <Typography as="div" variant="meta" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                    {kindLabel(s.kind)} · {formatShortDate(s.created_at)}
                  </Typography>
                  <Typography as="div" variant="body" className="mt-0.5" style={{ color: "hsl(var(--color-text-primary))" }}>
                    {s.title}
                  </Typography>
                  {s.circleNames.length > 0 && (
                    <Typography as="div" variant="meta" className="mt-0.5" style={{ color: "#561828" }}>
                      {s.circleNames.join(", ")}
                    </Typography>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MyMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={[
          { id: "settings", label: "Inställningar", onSelect: () => navigate("/settings") },
          { id: "circle", label: "Skapa en krets", onSelect: () => setCreating(true) },
        ]}
      />

      <PrimaryActionButton
        ariaLabel="Skapa en krets"
        options={[{ label: "Skapa en krets", onSelect: () => setCreating(true) }]}
      />


      {/* Create circle sheet */}
      <Sheet
        open={creating}
        onOpenChange={(o) => {
          setCreating(o);
          if (!o) setNewName("");
        }}
      >
        <BottomSheetContent>
          <BottomSheetHeader title="Skapa en krets" />
          <BottomSheetBody className="px-300 pt-300 pb-500 space-y-300">
            <Typography as="p" variant="body" className="text-muted-foreground">
              Ge din krets ett namn. Du kan bjuda in dina närmaste direkt efteråt.
            </Typography>
            <div className="rounded-300 p-300" style={{ backgroundColor: "#F9F3E1" }}>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createCircle();
                }}
                placeholder="Namn på kretsen"
                className={cn(typography.body, "w-full bg-transparent border-0 outline-none text-foreground")}
              />
            </div>
            <div className="pt-200 flex justify-center">
              <TextButton onClick={createCircle} disabled={!newName.trim()}>
                Skapa krets
              </TextButton>
            </div>
          </BottomSheetBody>
        </BottomSheetContent>
      </Sheet>
    </div>
  );
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 10) return "God morgon";
  if (h < 17) return "God dag";
  return "God kväll";
};

const kindLabel = (kind: SharedItem["kind"]) =>
  kind === "tip" ? "Tips" : kind === "meeting" ? "Träff" : "Uppdatering";

/** Small numbers read better as words: "Se fyra nya foton". */
const NUMBER_WORDS = ["noll", "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"];
const countWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const WEEKDAYS = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];

function formatMeetingDate(iso: string | null) {
  if (!iso) return "Datum ej satt";
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default HomePage;
