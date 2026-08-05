import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import PrimaryActionButton from "@/components/ui/primary-action-button";
import { type CircleHighlight, type CircleMemberPreview } from "@/components/cards/CircleDashboardCard";
import TopBar from "@/components/home/TopBar";
import { getGreeting } from "@/design-system/greetings";
import StickyHeader from "@/components/home/StickyHeader";
import { type CircleFilter } from "@/components/home/FilterButton";
import { type ProfileSummary } from "@/components/home/ProfileButton";
import ProfileFilterPill from "@/components/home/ProfileFilterPill";
import MyMenu, { type MyMenuGroup } from "@/components/home/MyMenu";
import CircleList, { type CircleListItem } from "@/components/home/CircleList";
import { useScrolled } from "@/hooks/useScrolled";
import { Bell, CalendarCheck, Archive, SlidersHorizontal, MessageSquareHeart, HandHeart } from "lucide-react";
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

interface CircleView extends CircleListItem {
  lastActivity: number;
}

/**
 * HomePage (Hem) — the signed-in user's private start page.
 *
 * ARCHITECTURE: Minby has no visitable profiles and no global feed. There is
 * exactly one home and it always belongs to the authenticated user.
 * This page only composes reusable components: TopBar, StickyHeader,
 * CircleList and the PrimaryActionButton.
 */
const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<CircleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<CircleFilter>("all");
  const [newName, setNewName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const scrolled = useScrolled();
  const [profile, setProfile] = useState<ProfileSummary>({
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

      /** Last time this user opened Hem — drives the orange activity ring. */
      const stored = Number(window.localStorage.getItem("minby:last-seen") ?? 0);
      const lastSeenTs = stored || Date.now() - 7 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem("minby:last-seen", String(Date.now()));

      const views: CircleView[] = list.map((c) => {
        const members = (memberRows ?? [])
          .filter((m) => m.circle_id === c.id)
          .map((m) => profById.get(m.user_id))
          .filter(Boolean) as CircleMemberPreview[];

        /**
         * Events are concrete and human. `weight` decides what becomes the
         * primary line — the thing most likely to make someone open the circle.
         */
        type Event = { primaryText: string; shortText: string; ts: number; weight: number; count: number };
        const events: Event[] = [];
        const at = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

        /** Who has created something in this circle since the user was last here. */
        const sinceTs = lastSeenTs;
        const activeIds = new Set<string>();
        const markActive = (id: string | null | undefined, iso?: string | null) => {
          if (id && id !== user.id && at(iso) > sinceTs) activeIds.add(id);
        };

        // Upcoming meeting — the strongest reason to open a circle
        const upcoming = (meetingRows ?? [])
          .filter((m) => m.circle_id === c.id && m.meeting_date && m.meeting_date >= today)
          .sort((a, b) => (a.meeting_date! < b.meeting_date! ? -1 : 1))[0];
        if (upcoming) {
          markActive(upcoming.created_by, upcoming.created_at);
          events.push({
            primaryText: upcoming.title,
            shortText: `${formatMeetingDate(upcoming.meeting_date)} · ${upcoming.title}`,
            ts: at(upcoming.created_at),
            weight: 4,
            count: 1,
          });
        }

        // Open poll
        const poll = (pollRows ?? [])
          .filter((p: any) => p.circle_id === c.id && !p.closed)
          .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))[0];
        if (poll) {
          markActive(poll.created_by, poll.created_at);
          events.push({
            primaryText: `${firstNameOf(poll.created_by)} skapade en omröstning`,
            shortText: "Svara på en omröstning",
            ts: at(poll.created_at),
            weight: 3,
            count: 1,
          });
        }

        // Tips
        const tips = (tipVis ?? [])
          .filter((tv: any) => tv.circle_id === c.id && tv.tips)
          .map((tv: any) => tv.tips)
          .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
        if (tips.length) {
          tips.forEach((t: any) => markActive(t.owner_id, t.created_at));
          events.push({
            primaryText: `${firstNameOf(tips[0].owner_id)} delade ett tips`,
            shortText: tips.length === 1 ? "Läs ett nytt tips" : `Läs ${countWord(tips.length)} nya tips`,
            ts: at(tips[0].created_at),
            weight: 2,
            count: tips.length,
          });
        }

        // Photos
        const photos = (photoVis ?? [])
          .filter((pv: any) => pv.circle_id === c.id && pv.photos)
          .map((pv: any) => pv.photos)
          .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
        if (photos.length) {
          photos.forEach((ph: any) => markActive(ph.owner_id, ph.created_at));
          events.push({
            primaryText:
              photos.length === 1
                ? `${firstNameOf(photos[0].owner_id)} delade ett foto`
                : `${firstNameOf(photos[0].owner_id)} delade ${countWord(photos.length)} foton`,
            shortText: photos.length === 1 ? "Se ett nytt foto" : `Se ${countWord(photos.length)} nya foton`,
            ts: at(photos[0].created_at),
            weight: 2,
            count: photos.length,
          });
        }

        // Chat
        const msgs = (messageRows ?? []).filter((m) => m.circle_id === c.id);
        if (msgs.length) {
          msgs.forEach((m) => markActive(m.user_id, m.created_at));
          events.push({
            primaryText: `${firstNameOf(msgs[0].user_id)} skrev i chatten`,
            shortText: msgs.length === 1 ? "Läs ett nytt meddelande" : "Läs vad som sagts i chatten",
            ts: at(msgs[0].created_at),
            weight: 1,
            count: msgs.length,
          });
        }

        const last = events.reduce((m, e) => Math.max(m, e.ts), 0);
        const ordered = [...events].sort((a, b) => b.weight - a.weight || b.ts - a.ts);
        const head = ordered[0];
        const rest = ordered.slice(1);

        return {
          ...c,
          members,
          activeMemberIds: Array.from(activeIds),
          primary: head ? { text: head.primaryText } : null,
          supporting: rest.slice(0, 2).map((e) => ({ text: e.shortText })),
          // Everything not already spelled out on the card, as a notice count.
          remaining: Math.max(
            0,
            events.reduce((sum, e) => sum + e.count, 0) - ordered.slice(0, 3).length
          ),
          lastActivity: last,
        };
      });

      views.sort((a, b) => b.lastActivity - a.lastActivity);
      setCircles(views);

      setMemberCount(memberIds.filter((id) => id !== user.id).length);
      setLoading(false);
    })();
  }, [user]);

  /** Keep the greeting in step with the time of day. */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = useMemo(() => getGreeting(profile.display_name, now), [profile.display_name, now]);



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

  /** Filtering is UI state only for now — the list is passed through. */
  const visibleCircles = useMemo(() => circles, [circles]);

  const menuGroups: MyMenuGroup[] = [
    {
      id: "mine",
      items: [
        { id: "notices", label: "Notiser", icon: Bell, onSelect: () => navigate("/settings") },
        { id: "meetings", label: "Mina träffar", icon: CalendarCheck, onSelect: () => navigate("/settings") },
        { id: "activity", label: "Min aktivitet", icon: Archive, onSelect: () => navigate("/settings") },
      ],
    },
    {
      id: "app",
      items: [
        { id: "settings", label: "Inställningar", icon: SlidersHorizontal, onSelect: () => navigate("/settings") },
        { id: "feedback", label: "Feedback", icon: MessageSquareHeart, onSelect: () => navigate("/feedback") },
      ],
    },
    {
      id: "support",
      items: [{ id: "donate", label: "Donera", icon: HandHeart, accent: true, onSelect: () => navigate("/settings") }],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-300 pt-safe pb-safe">
        <TopBar question={greeting} hidden={scrolled} />

        <StickyHeader
          actions={
            <ProfileFilterPill
              value={filter}
              onChange={setFilter}
              profile={profile}
              onOpenMenu={() => setMenuOpen(true)}
            />
          }
        />


        <main className="pt-200 pb-32">
          <h2 className="sr-only">Mina kretsar</h2>
          <CircleList
            circles={visibleCircles}
            loading={loading}
            onOpen={(id) => navigate(`/circle/${id}`)}
            emptyState={
              <div className="space-y-300">
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
        </main>
      </div>

      <MyMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        profile={profile}
        subtitle={`Du umgås i ${circles.length} kretsar, med ${memberCount} personer`}
        groups={menuGroups}
      />

      <PrimaryActionButton
        ariaLabel="Skapa nytt"
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
            <div className="rounded-300 p-300 bg-butter-100">
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

export default HomePage;

