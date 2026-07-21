import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, MessageCircle, Share2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import MeetingCard from "@/components/cards/MeetingCard";
import TipCard from "@/components/cards/TipCard";
import { MeetingCardSkeleton, TipCardSkeleton } from "@/components/cards/CardSkeletons";

interface Circle { id: string; name: string; hero_image_url: string | null; created_by: string; }
interface Meeting { id: string; title: string; meeting_date: string | null; created_by: string; response_count: number; host_name: string; }
interface Tip { id: string; title: string; url: string | null; comment: string | null; created_at: string; owner_id: string; owner_name: string; owner_avatar: string | null; }

const monthNames = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];
const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
};
const formatDateYear = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

const CirclePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingDesc, setMeetingDesc] = useState("");
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [showTipForm, setShowTipForm] = useState(false);
  const [tipTitle, setTipTitle] = useState("");
  const [tipUrl, setTipUrl] = useState("");
  const [tipComment, setTipComment] = useState("");
  const [savingTip, setSavingTip] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [user]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("circles").select("*").eq("id", id).maybeSingle();
      setCircle(data as Circle | null);
      const { count } = await supabase.from("circle_members").select("*", { count: "exact", head: true }).eq("circle_id", id);
      setMemberCount(count ?? 0);

      const { data: mtgs } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, created_by")
        .eq("circle_id", id)
        .order("meeting_date", { ascending: true })
        .limit(6);
      const meetingList = mtgs ?? [];
      const hostIds = [...new Set(meetingList.map((m) => m.created_by))];
      const { data: hostProfiles } = hostIds.length
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", hostIds)
        : { data: [] as { user_id: string; display_name: string | null }[] };
      const nameMap = new Map((hostProfiles ?? []).map((p) => [p.user_id, p.display_name ?? ""]));

      const withCounts = await Promise.all(
        meetingList.map(async (m) => {
          const { count: rc } = await supabase
            .from("meeting_responses")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", m.id)
            .eq("status", "yes");
          return { ...m, response_count: rc ?? 0, host_name: nameMap.get(m.created_by) ?? "" };
        })
      );
      setMeetings(withCounts);

      // Tips visible to this circle
      const { data: tipRows } = await supabase
        .from("tip_visibility")
        .select("tip_id, tips!inner(id, title, url, comment, created_at, owner_id)")
        .eq("circle_id", id)
        .order("tip_id", { ascending: false })
        .limit(10);
      const tipList = (tipRows ?? []).map((r: any) => r.tips).filter(Boolean) as Tip[];
      const ownerIds = [...new Set(tipList.map((t) => t.owner_id))];
      const { data: ownerProfs } = ownerIds.length
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ownerIds)
        : { data: [] as { user_id: string; display_name: string | null; avatar_url: string | null }[] };
      const ownerMap = new Map((ownerProfs ?? []).map((p) => [p.user_id, p]));
      setTips(
        tipList.map((t) => ({
          ...t,
          owner_name: ownerMap.get(t.owner_id)?.display_name ?? "",
          owner_avatar: ownerMap.get(t.owner_id)?.avatar_url ?? null,
        }))
      );
      setLoadingContent(false);
    })();
  }, [id]);

  const invite = async () => {
    if (!id || !user) return;
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("circle_invites").insert({
      token, circle_id: id, created_by: user.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    const url = `${window.location.origin}/invite/${token}`;
    if (navigator.share) {
      try { await navigator.share({ title: circle?.name ?? "Krets", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Länken är kopierad");
    }
  };

  const respondYes = async (meetingId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("meeting_responses")
      .upsert({ meeting_id: meetingId, user_id: user.id, status: "yes" }, { onConflict: "meeting_id,user_id" });
    if (error) toast.error(error.message);
    else {
      setMeetings((prev) => prev.map((m) => m.id === meetingId ? { ...m, response_count: m.response_count + 1 } : m));
      toast.success("Du är med!");
    }
  };

  const createMeeting = async () => {
    if (!user || !id || !meetingTitle.trim()) return;
    setSavingMeeting(true);
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        circle_id: id,
        created_by: user.id,
        title: meetingTitle.trim(),
        meeting_date: meetingDate || null,
        description: meetingDesc.trim() || null,
      })
      .select("id, title, meeting_date, created_by")
      .single();
    setSavingMeeting(false);
    if (error || !data) { toast.error(error?.message ?? "Kunde inte spara"); return; }
    setMeetings((prev) => [...prev, { ...data, response_count: 0, host_name: displayName }]);
    setMeetingTitle(""); setMeetingDate(""); setMeetingDesc(""); setShowMeetingForm(false);
    toast.success("Träffen är skapad");
  };

  const createTip = async () => {
    if (!user || !id || !tipTitle.trim()) return;
    setSavingTip(true);
    const { data, error } = await supabase
      .from("tips")
      .insert({
        owner_id: user.id,
        title: tipTitle.trim(),
        url: tipUrl.trim() || null,
        comment: tipComment.trim() || null,
      })
      .select("id, title, url, comment, created_at, owner_id")
      .single();
    if (error || !data) { setSavingTip(false); toast.error(error?.message ?? "Kunde inte spara"); return; }
    const { error: visErr } = await supabase.from("tip_visibility").insert({ tip_id: data.id, circle_id: id });
    setSavingTip(false);
    if (visErr) { toast.error(visErr.message); return; }
    setTips((prev) => [{ ...data, owner_name: displayName, owner_avatar: avatarUrl }, ...prev]);
    setTipTitle(""); setTipUrl(""); setTipComment(""); setShowTipForm(false);
    toast.success("Tipset är delat");
  };

  if (!circle) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">Laddar…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pt-safe pb-safe">
        <header className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => navigate("/")} aria-label="Tillbaka" className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl">{circle.name}</h1>
        </header>

        <div className="px-5 space-y-4">
          <p className="text-sm text-muted-foreground">{memberCount} {memberCount === 1 ? "medlem" : "medlemmar"}</p>

          <div className="flex gap-2">
            <Button onClick={() => navigate(`/chat/${circle.id}`)} className="flex-1 rounded-lg justify-center gap-2" style={{ backgroundColor: "#561828", color: "#fff" }}>
              <MessageCircle className="w-4 h-4" /> Öppna chatten
            </Button>
            <Button onClick={invite} variant="outline" className="rounded-lg justify-center gap-2">
              <Share2 className="w-4 h-4" /> Bjud in
            </Button>
          </div>
        </div>

        <section className="mt-8">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h2 className="text-[15px]" style={{ fontFamily: "'Fraunces', serif", color: "#2E1F3E" }}>Träffar</h2>
            <button
              onClick={() => setShowMeetingForm((v) => !v)}
              aria-label={showMeetingForm ? "Stäng" : "Ny träff"}
              className="p-1.5 rounded-lg hover:bg-black/5"
            >
              {showMeetingForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
          {showMeetingForm && (
            <div className="mx-5 mb-4 p-4 rounded-lg bg-white space-y-2">
              <Input
                placeholder="Vad ska ni göra?"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="rounded-lg"
              />
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="rounded-lg"
              />
              <Textarea
                placeholder="Beskrivning (valfritt)"
                value={meetingDesc}
                onChange={(e) => setMeetingDesc(e.target.value)}
                rows={2}
                className="rounded-lg resize-none"
              />
              <div className="flex justify-end pt-1">
                <Button
                  onClick={createMeeting}
                  disabled={!meetingTitle.trim() || savingMeeting}
                  className="rounded-lg"
                  style={{ backgroundColor: "#561828", color: "#fff" }}
                >
                  {savingMeeting ? "Sparar…" : "Skapa träff"}
                </Button>
              </div>
            </div>
          )}
          {loadingContent ? (
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <MeetingCardSkeleton />
              <MeetingCardSkeleton />
              <MeetingCardSkeleton />
            </div>
          ) : meetings.length === 0 ? (
            <p className="px-5 text-sm text-muted-foreground">Ingen träff planerad ännu.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {meetings.map((m) => (
                <MeetingCard
                  key={m.id}
                  hostName={m.host_name}
                  dateLabel={formatDate(m.meeting_date)}
                  title={m.title}
                  responseCount={m.response_count}
                  onRespond={() => respondYes(m.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px]" style={{ fontFamily: "'Fraunces', serif", color: "#2E1F3E" }}>Tips</h2>
            <button
              onClick={() => setShowTipForm((v) => !v)}
              aria-label={showTipForm ? "Stäng" : "Nytt tips"}
              className="p-1.5 rounded-lg hover:bg-black/5"
            >
              {showTipForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
          {showTipForm && (
            <div className="mb-4 p-4 rounded-lg bg-white space-y-2">
              <Input
                placeholder="Titel"
                value={tipTitle}
                onChange={(e) => setTipTitle(e.target.value)}
                className="rounded-lg"
              />
              <Input
                placeholder="Länk (valfritt)"
                value={tipUrl}
                onChange={(e) => setTipUrl(e.target.value)}
                className="rounded-lg"
              />
              <Textarea
                placeholder="Kommentar (valfritt)"
                value={tipComment}
                onChange={(e) => setTipComment(e.target.value)}
                rows={2}
                className="rounded-lg resize-none"
              />
              <div className="flex justify-end pt-1">
                <Button
                  onClick={createTip}
                  disabled={!tipTitle.trim() || savingTip}
                  className="rounded-lg"
                  style={{ backgroundColor: "#561828", color: "#fff" }}
                >
                  {savingTip ? "Sparar…" : "Dela tips"}
                </Button>
              </div>
            </div>
          )}
          {loadingContent ? (
            <div className="space-y-3">
              <TipCardSkeleton />
              <TipCardSkeleton />
            </div>
          ) : tips.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga tips delade ännu.</p>
          ) : (
            <div className="space-y-3">
              {tips.map((t) => (
                <TipCard
                  key={t.id}
                  ownerName={t.owner_name}
                  ownerAvatar={t.owner_avatar}
                  dateLabel={formatDateYear(t.created_at)}
                  title={t.title}
                  description={t.comment}
                  url={t.url}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CirclePage;
