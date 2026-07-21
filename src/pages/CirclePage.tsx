import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronLeft, MessageCircle, Share2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import MeetingCard from "@/components/cards/MeetingCard";
import PhotoTile from "@/components/cards/PhotoTile";
import { MeetingCardSkeleton, PhotoTileSkeleton } from "@/components/cards/CardSkeletons";

interface Circle { id: string; name: string; hero_image_url: string | null; created_by: string; }
interface Meeting { id: string; title: string; meeting_date: string | null; description?: string | null; created_by: string; response_count: number; host_name: string; }
interface Tip { id: string; title: string; url: string | null; comment: string | null; created_at: string; owner_id: string; owner_name: string; image_path: string | null; image_url?: string | null; }
interface Photo { id: string; storage_path: string; owner_id: string; owner_name: string; created_at: string; image_url?: string | null; }

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
const formatDateShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3)}`;
};
const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3)}, ${d.getHours().toString().padStart(2, "0")}.${d.getMinutes().toString().padStart(2, "0")}`;
};

const HEADING_STYLE = { fontFamily: "'Outfit', sans-serif", color: "#2E1F3E" } as const;
const LINK_STYLE = { color: "#C4522A" } as const;
const CARD_YELLOW = "hsl(44, 65%, 93%)";
const CARD_BLUE = "hsl(210, 45%, 94%)";

const CirclePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [aiSummary, setAiSummary] = useState<{ content: string; generated_at: string; author?: string | null } | null>(null);
  const [sinceLast, setSinceLast] = useState<{ label: string; body: string } | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  const [displayName, setDisplayName] = useState("");

  // sheets/forms
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

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingAttendees, setMeetingAttendees] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  const signPhotoUrls = async <T extends { storage_path?: string | null; image_path?: string | null }>(items: T[], key: "storage_path" | "image_path"): Promise<(T & { image_url: string | null })[]> => {
    const paths = items.map((i) => (i as any)[key]).filter(Boolean) as string[];
    if (!paths.length) return items.map((i) => ({ ...i, image_url: null }));
    const { data } = await supabase.storage.from("circle-photos").createSignedUrls(paths, 60 * 60);
    const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
    return items.map((i) => ({ ...i, image_url: (i as any)[key] ? map.get((i as any)[key]) ?? null : null }));
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("circles").select("*").eq("id", id).maybeSingle();
      setCircle(data as Circle | null);

      const { data: mems } = await supabase.from("circle_members").select("user_id").eq("circle_id", id);
      const memberIds = (mems ?? []).map((m) => m.user_id);
      const { data: memberProfs } = memberIds.length
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", memberIds)
        : { data: [] as { user_id: string; display_name: string | null }[] };
      setMembers(memberProfs ?? []);
      const nameMap = new Map((memberProfs ?? []).map((p) => [p.user_id, p.display_name ?? ""]));

      // Meetings
      const { data: mtgs } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, description, created_by")
        .eq("circle_id", id)
        .order("meeting_date", { ascending: true })
        .limit(10);
      const meetingList = mtgs ?? [];
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

      // Tips
      const { data: tipRows } = await supabase
        .from("tip_visibility")
        .select("tip_id, tips!inner(id, title, url, comment, created_at, owner_id, image_path)")
        .eq("circle_id", id)
        .order("tip_id", { ascending: false })
        .limit(20);
      const tipList = (tipRows ?? [])
        .map((r: any) => r.tips)
        .filter(Boolean)
        .map((t: any) => ({ ...t, owner_name: nameMap.get(t.owner_id) ?? "" })) as Tip[];
      const signedTips = await signPhotoUrls(tipList, "image_path");
      setTips(signedTips);

      // Photos
      const { data: photoRows } = await supabase
        .from("photo_visibility")
        .select("photo_id, photos!inner(id, storage_path, owner_id, created_at)")
        .eq("circle_id", id)
        .order("photo_id", { ascending: false })
        .limit(20);
      const photoList = (photoRows ?? [])
        .map((r: any) => r.photos)
        .filter(Boolean)
        .map((p: any) => ({ ...p, owner_name: nameMap.get(p.owner_id) ?? "" })) as Photo[];
      const signedPhotos = await signPhotoUrls(photoList, "storage_path");
      setPhotos(signedPhotos);

      // AI summary
      const { data: summary } = await supabase
        .from("circle_ai_summary")
        .select("content, generated_at")
        .eq("circle_id", id)
        .maybeSingle();
      if (summary) {
        const { data: last } = await supabase
          .from("messages")
          .select("user_id")
          .eq("circle_id", id)
          .lte("created_at", summary.generated_at)
          .order("created_at", { ascending: false })
          .limit(1);
        const author = last?.[0]?.user_id ? nameMap.get(last[0].user_id) ?? null : null;
        setAiSummary({ ...summary, author });
      }

      // "Sedan sist" — last activity in circle (meeting/tip/photo)
      const latestTs = [
        ...withCounts.map((m) => m.meeting_date ? { ts: m.meeting_date, body: `Ny träff: ${m.title}` } : null),
        ...signedTips.map((t) => ({ ts: t.created_at, body: `${t.owner_name} delade tipset ${t.title}` })),
        ...signedPhotos.map((p) => ({ ts: p.created_at, body: `${p.owner_name} lade upp ett nytt foto` })),
      ].filter(Boolean).sort((a: any, b: any) => new Date(b!.ts).getTime() - new Date(a!.ts).getTime())[0] as any;
      if (latestTs) {
        setSinceLast({ label: `Senaste händelsen: ${formatTimestamp(latestTs.ts)}`, body: latestTs.body });
      }

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
      .select("id, title, meeting_date, description, created_by")
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
      .select("id, title, url, comment, created_at, owner_id, image_path")
      .single();
    if (error || !data) { setSavingTip(false); toast.error(error?.message ?? "Kunde inte spara"); return; }
    const { error: visErr } = await supabase.from("tip_visibility").insert({ tip_id: data.id, circle_id: id });
    setSavingTip(false);
    if (visErr) { toast.error(visErr.message); return; }
    setTips((prev) => [{ ...data, owner_name: displayName, image_url: null }, ...prev]);
    setTipTitle(""); setTipUrl(""); setTipComment(""); setShowTipForm(false);
    toast.success("Tipset är delat");
  };

  const uploadPhoto = async (file: File) => {
    if (!user || !id) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("circle-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: photoRow, error: insErr } = await supabase
        .from("photos")
        .insert({ owner_id: user.id, storage_path: path })
        .select("id, storage_path, owner_id, created_at")
        .single();
      if (insErr || !photoRow) throw insErr ?? new Error("Kunde inte spara foto");
      const { error: visErr } = await supabase.from("photo_visibility").insert({ photo_id: photoRow.id, circle_id: id });
      if (visErr) throw visErr;
      const { data: signed } = await supabase.storage.from("circle-photos").createSignedUrl(path, 60 * 60);
      setPhotos((prev) => [{ ...photoRow, owner_name: displayName, image_url: signed?.signedUrl ?? null }, ...prev]);
      toast.success("Fotot är delat");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte ladda upp");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openMeeting = async (m: Meeting) => {
    setSelectedMeeting(m);
    setMeetingAttendees([]);
    const { data } = await supabase
      .from("meeting_responses")
      .select("user_id")
      .eq("meeting_id", m.id)
      .eq("status", "yes");
    const ids = (data ?? []).map((r) => r.user_id);
    if (!ids.length) return;
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ids);
    setMeetingAttendees(profs ?? []);
  };

  if (!circle) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">Laddar…</div>;
  }

  const memberNames = members.map((m) => m.display_name).filter(Boolean).slice(0, 6).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pb-safe">
        {/* Hero */}
        <div
          className="relative w-full h-[220px] overflow-hidden"
          style={{
            backgroundColor: "#8b6f5e",
            backgroundImage: circle.hero_image_url ? `url(${circle.hero_image_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <button
            onClick={() => navigate("/")}
            aria-label="Tillbaka"
            className="absolute top-3 left-3 p-2 rounded-lg text-white pt-safe"
            style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={invite}
            aria-label="Bjud in"
            className="absolute top-3 right-3 p-2 rounded-lg text-white pt-safe"
            style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
          >
            <Share2 className="w-5 h-5" />
          </button>
          <div
            className="absolute inset-x-0 bottom-0 px-5 pt-10 pb-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)" }}
          >
            <h1 className="text-white text-[26px] leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {circle.name}
            </h1>
            {memberNames && (
              <p className="text-white/85 text-[13px] mt-1 truncate">{memberNames}{members.length > 6 ? "…" : ""}</p>
            )}
          </div>
        </div>

        {/* Sedan sist */}
        {sinceLast && (
          <section className="mt-6 px-5">
            <h2 className="text-[16px] mb-3" style={HEADING_STYLE}>Sedan sist</h2>
            <div className="rounded-lg p-4" style={{ backgroundColor: CARD_YELLOW }}>
              <div className="text-[11px] mb-2 font-medium" style={{ color: "hsl(20, 4%, 40%)" }}>
                {sinceLast.label}
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "#2E1F3E" }}>
                {sinceLast.body}
              </p>
            </div>
          </section>
        )}

        {/* Våra förslag att ses */}
        <section className="mt-8">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h2 className="text-[16px]" style={HEADING_STYLE}>Våra förslag att ses</h2>
            <button
              onClick={() => setShowMeetingForm(true)}
              className="text-[13px] font-medium underline underline-offset-4"
              style={LINK_STYLE}
            >
              + Föreslå en träff
            </button>
          </div>
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
                  hostName={m.host_name ? `${m.host_name}` : ""}
                  dateLabel={formatDate(m.meeting_date)}
                  title={m.title}
                  responseCount={m.response_count}
                  onRespond={() => respondYes(m.id)}
                  onOpen={() => openMeeting(m)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Chatt */}
        <section className="mt-8 px-5">
          <h2 className="text-[16px] mb-3" style={HEADING_STYLE}>Chatt</h2>
          <div className="rounded-lg p-4" style={{ backgroundColor: CARD_BLUE }}>
            {aiSummary ? (
              <>
                <div className="text-[11px] mb-2 font-medium" style={{ color: "hsl(210, 20%, 35%)" }}>
                  Senast uppdaterad: {formatTimestamp(aiSummary.generated_at)}
                  {aiSummary.author ? ` av ${aiSummary.author}` : ""}
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color: "#2E1F3E" }}>
                  {aiSummary.content}
                </p>
              </>
            ) : (
              <p className="text-[14px] leading-relaxed" style={{ color: "#2E1F3E" }}>
                Ingen sammanfattning ännu. Skriv några meddelanden så plockar vi upp tråden.
              </p>
            )}
            <button
              onClick={() => navigate(`/chat/${circle.id}`)}
              className="mt-4 text-[14px] font-medium underline underline-offset-4 inline-flex items-center gap-1"
              style={LINK_STYLE}
            >
              <MessageCircle className="w-4 h-4" /> Se hela chatten
            </button>
          </div>
        </section>

        {/* Våra tips */}
        <section className="mt-8">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h2 className="text-[16px]" style={HEADING_STYLE}>Våra tips</h2>
            <button
              onClick={() => setShowTipForm(true)}
              className="text-[13px] font-medium underline underline-offset-4"
              style={LINK_STYLE}
            >
              + Lägg till tips
            </button>
          </div>
          {loadingContent ? (
            <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <PhotoTileSkeleton />
              <PhotoTileSkeleton />
              <PhotoTileSkeleton />
            </div>
          ) : tips.length === 0 ? (
            <p className="px-5 text-sm text-muted-foreground">Inga tips delade ännu.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {tips.map((t) => (
                <PhotoTile
                  key={t.id}
                  imageUrl={t.image_url ?? null}
                  title={t.title}
                  ownerName={t.owner_name}
                  onOpen={() => setSelectedTip(t)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Våra foton */}
        <section className="mt-8 mb-10">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h2 className="text-[16px]" style={HEADING_STYLE}>Våra foton</h2>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="text-[13px] font-medium underline underline-offset-4 disabled:opacity-50"
              style={LINK_STYLE}
            >
              {uploadingPhoto ? "Laddar upp…" : "+ Lägg foto"}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
          </div>
          {loadingContent ? (
            <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <PhotoTileSkeleton />
              <PhotoTileSkeleton />
              <PhotoTileSkeleton />
            </div>
          ) : photos.length === 0 ? (
            <p className="px-5 text-sm text-muted-foreground">Inga foton delade ännu.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {photos.map((p) => (
                <PhotoTile
                  key={p.id}
                  imageUrl={p.image_url ?? null}
                  title={p.owner_name}
                  ownerName={formatDateShort(p.created_at)}
                  onOpen={() => setSelectedPhoto(p)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Meeting create sheet */}
      <Sheet open={showMeetingForm} onOpenChange={setShowMeetingForm}>
        <SheetContent side="bottom" className="rounded-t-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="text-left">
            <SheetTitle style={HEADING_STYLE}>Föreslå en träff</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <Input placeholder="Vad ska ni göra?" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="rounded-lg" />
            <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="rounded-lg" />
            <Textarea placeholder="Beskrivning (valfritt)" value={meetingDesc} onChange={(e) => setMeetingDesc(e.target.value)} rows={3} className="rounded-lg resize-none" />
            <div className="flex justify-end pt-2">
              <Button onClick={createMeeting} disabled={!meetingTitle.trim() || savingMeeting} className="rounded-lg" style={{ backgroundColor: "#561828", color: "#fff" }}>
                {savingMeeting ? "Sparar…" : "Skapa träff"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tip create sheet */}
      <Sheet open={showTipForm} onOpenChange={setShowTipForm}>
        <SheetContent side="bottom" className="rounded-t-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="text-left">
            <SheetTitle style={HEADING_STYLE}>Dela ett tips</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <Input placeholder="Titel" value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} className="rounded-lg" />
            <Input placeholder="Länk (valfritt)" value={tipUrl} onChange={(e) => setTipUrl(e.target.value)} className="rounded-lg" />
            <Textarea placeholder="Kommentar (valfritt)" value={tipComment} onChange={(e) => setTipComment(e.target.value)} rows={3} className="rounded-lg resize-none" />
            <div className="flex justify-end pt-2">
              <Button onClick={createTip} disabled={!tipTitle.trim() || savingTip} className="rounded-lg" style={{ backgroundColor: "#561828", color: "#fff" }}>
                {savingTip ? "Sparar…" : "Dela tips"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Meeting detail sheet */}
      <Sheet open={!!selectedMeeting} onOpenChange={(o) => !o && setSelectedMeeting(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedMeeting && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle style={HEADING_STYLE}>{selectedMeeting.title}</SheetTitle>
                <SheetDescription className="text-[13px]">
                  {selectedMeeting.host_name}
                  {selectedMeeting.meeting_date ? ` · ${formatDateYear(selectedMeeting.meeting_date)}` : ""}
                </SheetDescription>
              </SheetHeader>
              {selectedMeeting.description && (
                <p className="mt-4 text-[14px] whitespace-pre-wrap" style={{ color: "#2E1F3E" }}>
                  {selectedMeeting.description}
                </p>
              )}
              <div className="mt-6">
                <div className="text-[12px] uppercase tracking-wide mb-2" style={{ color: "hsl(20, 4%, 54%)" }}>
                  Med på träffen
                </div>
                {meetingAttendees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingen har svarat ännu.</p>
                ) : (
                  <ul className="space-y-1">
                    {meetingAttendees.map((a) => (
                      <li key={a.user_id} className="text-[14px]" style={{ color: "#2E1F3E" }}>
                        {a.display_name ?? "Anonym"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-6 flex gap-2">
                <Button onClick={() => { respondYes(selectedMeeting.id); setSelectedMeeting(null); }} className="flex-1 rounded-lg" style={{ backgroundColor: "#561828", color: "#fff" }}>
                  Häng med!
                </Button>
                <Button variant="outline" onClick={() => { navigate(`/chat/${circle.id}`); setSelectedMeeting(null); }} className="rounded-lg">
                  <MessageCircle className="w-4 h-4 mr-1" /> Till chatten
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Tip detail sheet */}
      <Sheet open={!!selectedTip} onOpenChange={(o) => !o && setSelectedTip(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedTip && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle style={HEADING_STYLE}>{selectedTip.title}</SheetTitle>
                <SheetDescription className="text-[13px]">
                  {selectedTip.owner_name} · {formatDateYear(selectedTip.created_at)}
                </SheetDescription>
              </SheetHeader>
              {selectedTip.image_url && (
                <div className="mt-4 w-full h-[160px] rounded-lg bg-center bg-cover" style={{ backgroundImage: `url(${selectedTip.image_url})` }} />
              )}
              {selectedTip.comment && (
                <p className="mt-4 text-[14px] whitespace-pre-wrap" style={{ color: "#2E1F3E" }}>
                  {selectedTip.comment}
                </p>
              )}
              {selectedTip.url && (
                <a href={selectedTip.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium underline underline-offset-4" style={LINK_STYLE}>
                  <ExternalLink className="w-4 h-4" /> Öppna länken
                </a>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Photo detail sheet */}
      <Sheet open={!!selectedPhoto} onOpenChange={(o) => !o && setSelectedPhoto(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedPhoto && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle style={HEADING_STYLE}>{selectedPhoto.owner_name}</SheetTitle>
                <SheetDescription className="text-[13px]">
                  {formatDateYear(selectedPhoto.created_at)}
                </SheetDescription>
              </SheetHeader>
              {selectedPhoto.image_url && (
                <img src={selectedPhoto.image_url} alt="" className="mt-4 w-full rounded-lg object-cover max-h-[70vh]" />
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CirclePage;
