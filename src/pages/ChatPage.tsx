import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Send, Camera, CalendarPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import TextButton from "@/components/ui/text-button";
import { GRADIENTS } from "@/lib/card-styles";
import Typography from "@/components/ui/typography";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";
import AddToHomeScreenSheet from "@/components/circle/AddToHomeScreenSheet";


interface Message {
  id: string;
  user_id: string | null;
  body: string | null;
  kind: string;
  payload: any;
  created_at: string;
  image_url?: string | null;
}
interface Circle {
  id: string;
  name: string;
  hero_image_url: string | null;
}
interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const monthShort = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}.${d.getMinutes().toString().padStart(2, "0")}`;
};
const formatDayLabel = (iso: string) => {
  const d = new Date(iso);
  const t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Idag";
  if (d.toDateString() === y.toDateString()) return "Igår";
  return `${d.getDate()} ${monthShort[d.getMonth()]}`;
};
const formatMeetingDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"][d.getMonth()]}`;
};

const ChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dividerInfo, setDividerInfo] = useState<{ id: string; count: number } | null>(null);
  const [meetingResponses, setMeetingResponses] = useState<Record<string, "yes" | "no" | undefined>>({});
  const [body, setBody] = useState("");
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [addHomeOpen, setAddHomeOpen] = useState(false);
  const [addHomeSenderName, setAddHomeSenderName] = useState("");

  // Shown once, right after a guest's first reply from the invite flow.
  useEffect(() => {
    if (!id) return;
    const key = `minby_show_add_home_${id}`;
    try {
      const senderName = sessionStorage.getItem(key);
      if (senderName !== null) {
        sessionStorage.removeItem(key);
        setAddHomeSenderName(senderName);
        setAddHomeOpen(true);
      }
    } catch { /* ignore */ }
  }, [id]);

  const nameMap = useMemo(() => new Map(members.map((m) => [m.user_id, m.display_name ?? "Någon"])), [members]);
  const avatarMap = useMemo(() => new Map(members.map((m) => [m.user_id, m.avatar_url])), [members]);

  // Sign image URLs for photo messages
  const signImageMessages = async (msgs: Message[]) => {
    const paths = msgs
      .filter((m) => m.kind === "photo" && m.payload?.storage_path)
      .map((m) => m.payload.storage_path as string);
    if (!paths.length) return msgs;
    const { data } = await supabase.storage.from("circle-photos").createSignedUrls(paths, 60 * 60);
    const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
    return msgs.map((m) =>
      m.kind === "photo" && m.payload?.storage_path
        ? { ...m, image_url: map.get(m.payload.storage_path) ?? null }
        : m,
    );
  };

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [{ data: c }, { data: mems }, { data: msgs }, { data: sum }, { data: myMember }] = await Promise.all([
        supabase.from("circles").select("id, name, hero_image_url").eq("id", id).maybeSingle(),
        supabase.from("circle_members").select("user_id").eq("circle_id", id),
        supabase.from("messages").select("id, user_id, body, kind, payload, created_at").eq("circle_id", id).order("created_at", { ascending: true }).limit(200),
        supabase.from("circle_ai_summary").select("content").eq("circle_id", id).maybeSingle(),
        supabase.from("circle_members").select("last_read_at").eq("circle_id", id).eq("user_id", user.id).maybeSingle(),
      ]);
      setCircle(c as Circle | null);
      const memberIds = (mems ?? []).map((m) => m.user_id);
      if (memberIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", memberIds);
        setMembers((profs ?? []) as Member[]);
      }
      const signed = await signImageMessages((msgs ?? []) as Message[]);

      // Snapshot what's unread *before* marking the circle as read, so the
      // divider reflects what was new when the chat was opened.
      const oldLastReadAt = myMember?.last_read_at ?? new Date(0).toISOString();
      const unread = signed.filter((m) => m.user_id && m.user_id !== user.id && m.created_at > oldLastReadAt);

      setMessages(signed);
      setDividerInfo(unread.length > 0 ? { id: unread[0].id, count: unread.length } : null);
      if (sum?.content) setSummary(sum.content);

      supabase
        .from("circle_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("circle_id", id)
        .eq("user_id", user.id)
        .then(({ error }) => { if (error) console.error(error); });

      // Load current user's responses to any meeting messages
      const meetingIds = signed
        .filter((m) => m.kind === "meeting_proposal" && m.payload?.meeting_id)
        .map((m) => m.payload.meeting_id as string);
      if (meetingIds.length) {
        const { data: rs } = await supabase
          .from("meeting_responses")
          .select("meeting_id, status")
          .in("meeting_id", meetingIds)
          .eq("user_id", user.id);
        setMeetingResponses(Object.fromEntries((rs ?? []).map((r) => [r.meeting_id, r.status as "yes" | "no"])));
      }
    })();

    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `circle_id=eq.${id}` },
        async (payload) => {
          const m = payload.new as Message;
          const [signed] = await signImageMessages([m]);
          setMessages((prev) => (prev.some((x) => x.id === signed.id) ? prev : [...prev, signed]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (didInitialScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    didInitialScroll.current = true;
    // Let the divider render first, then jump to it (or the bottom if nothing's unread).
    requestAnimationFrame(() => {
      if (dividerInfo) dividerRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      else bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [messages.length, dividerInfo]);

  // Opened via the circle page's composer ("Skriv till …") — bring up the keyboard.
  useEffect(() => {
    if (searchParams.get("focus") === "1") inputRef.current?.focus();
  }, [searchParams]);

  const send = async () => {
    if (!id || !user || !body.trim()) return;
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("messages").insert({ circle_id: id, user_id: user.id, body: text, kind: "text" });
    if (error) toast.error(error.message);
  };

  const uploadPhoto = async (file: File) => {
    if (!id || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("circle-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: photoRow, error: pErr } = await supabase
        .from("photos")
        .insert({ owner_id: user.id, storage_path: path })
        .select("id")
        .single();
      if (pErr || !photoRow) throw pErr;
      await supabase.from("photo_visibility").insert({ photo_id: photoRow.id, circle_id: id });
      const { error: mErr } = await supabase.from("messages").insert({
        circle_id: id, user_id: user.id, kind: "photo", body: null,
        payload: { photo_id: photoRow.id, storage_path: path },
      });
      if (mErr) throw mErr;
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte skicka bild");
    } finally {
      setUploading(false);
    }
  };

  const submitMeetingProposal = async () => {
    if (!id || !user || !mTitle.trim()) return;
    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({ circle_id: id, created_by: user.id, title: mTitle.trim(), meeting_date: mDate || null })
      .select("id, title, meeting_date")
      .single();
    if (error || !meeting) { toast.error(error?.message ?? "Kunde inte skapa"); return; }
    await supabase.from("messages").insert({
      circle_id: id, user_id: user.id, kind: "meeting_proposal", body: null,
      payload: { meeting_id: meeting.id, title: meeting.title, meeting_date: meeting.meeting_date },
    });
    setMTitle(""); setMDate(""); setShowMeetingForm(false);
  };

  const respondMeeting = async (meetingId: string, status: "yes" | "no") => {
    if (!user) return;
    setMeetingResponses((r) => ({ ...r, [meetingId]: status }));
    const { error } = await supabase
      .from("meeting_responses")
      .upsert({ meeting_id: meetingId, user_id: user.id, status }, { onConflict: "meeting_id,user_id" });
    if (error) toast.error(error.message);
  };

  const runSummarize = async () => {
    if (!id) return;
    setSummarizing(true);
    setSummaryOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-chat", { body: { circle_id: id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary((data as any).content);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte sammanfatta");
      setSummaryOpen(false);
    } finally {
      setSummarizing(false);
    }
  };

  const memberPreview = members.map((m) => m.display_name).filter(Boolean).slice(0, 5).join(", ");

  // Group messages by day
  const grouped: { day: string; items: Message[] }[] = [];
  messages.forEach((m) => {
    const label = formatDayLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.day === label) last.items.push(m);
    else grouped.push({ day: label, items: [m] });
  });

  const myAvatar = user ? avatarMap.get(user.id) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0EAE2" }}>
      {/* Hero */}
      <div
        className="relative w-full h-[220px] overflow-hidden max-w-lg mx-auto w-full"
        style={{
          backgroundColor: "hsl(var(--avatar-fallback))",
          backgroundImage: circle?.hero_image_url ? `url(${circle.hero_image_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: GRADIENTS.subtle }} />
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <Typography variant="display" as="h1">{circle?.name ?? ""}</Typography>
          {memberPreview && <Typography variant="meta" as="p" className="opacity-90 mt-1 truncate">{memberPreview}</Typography>}
        </div>
      </div>

      {/* Chat sheet */}
      <div
        className="flex-1 flex flex-col max-w-lg mx-auto w-full relative"
        style={{
          backgroundColor: "#FAF6EE",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -20,
          boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <header className="relative flex items-center justify-center px-5 pt-300 pb-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={() => navigate(`/circle/${id}`)} aria-label="Stäng" className="absolute left-4 p-100">
            <X className="w-5 h-5" style={{ color: "hsl(var(--color-text-primary))" }} />
          </button>
          <Typography variant="heading" as="h2" style={{ color: "hsl(var(--color-text-primary))" }}>Chatt</Typography>
          <button
            onClick={runSummarize}
            aria-label="Sammanfatta chatten"
            className="absolute right-4 p-100 flex items-center gap-100"
            style={{ color: "hsl(var(--primary))" }}
            disabled={summarizing}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </header>

        {summaryOpen && (
          <div className="mx-4 mt-3 rounded-200 p-300 relative" style={{ backgroundColor: "hsl(var(--primary))", color: "#F0EAE2" }}>
            <button onClick={() => setSummaryOpen(false)} className="absolute top-2 right-2 p-100 opacity-80" aria-label="Stäng">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-200 mb-2">
              <Sparkles className="w-4 h-4" />
              <Typography variant="eyebrow" as="span" >AI-sammanfattning</Typography>
            </div>
            {summarizing ? (
              <Typography variant="body" as="p" className="opacity-80">Läser chatten…</Typography>
            ) : (
              <Typography variant="body" as="p" className="whitespace-pre-wrap">{summary}</Typography>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-300 py-300 space-y-300">
          {messages.length === 0 && (
            <Typography variant="meta" as="p" className="text-center text-muted-foreground py-12">Säg något så börjar det.</Typography>
          )}
          {grouped.map((g, gi) => (
            <div key={gi} className="space-y-3">
              <div className="text-center">
                <Typography variant="meta" as="span" style={{ color: "hsl(var(--color-text-tertiary))" }}>{g.day}</Typography>
              </div>
              {g.items.map((m) => {
                const mine = m.user_id === user?.id;
                const avatar = avatarMap.get(m.user_id ?? "");
                const initial = (nameMap.get(m.user_id ?? "") ?? "?").charAt(0).toUpperCase();
                const Avatar = (
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: "hsl(var(--breeze-100))" }}
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Typography variant="meta" as="span" style={{ color: "hsl(var(--color-text-primary))" }}>{initial}</Typography>
                    )}
                  </div>
                );

                const divider = dividerInfo?.id === m.id && (
                  <div ref={dividerRef} className="flex items-center gap-300 py-1">
                    <div className="flex-1 h-px bg-activity opacity-30" />
                    <Typography variant="meta" as="span" className="flex-shrink-0 text-activity" style={{ fontWeight: 500 }}>
                      {dividerInfo.count} {dividerInfo.count === 1 ? "ny" : "nya"}
                    </Typography>
                    <div className="flex-1 h-px bg-activity opacity-30" />
                  </div>
                );

                if (m.kind === "meeting_proposal") {
                  const meetingId = m.payload?.meeting_id as string;
                  const resp = meetingResponses[meetingId];
                  return (
                    <Fragment key={m.id}>
                      {divider}
                      <div className="flex items-end gap-200">
                        {!mine && Avatar}
                        <div
                          className="max-w-[78%] rounded-200 p-300"
                          style={{ backgroundColor: "hsl(var(--butter-150))" }}
                        >
                          <Typography variant="meta" as="div" className="mb-1" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                            Förslag att ses
                          </Typography>
                          <Typography variant="heading" as="div" className="mb-3" style={{ color: "hsl(var(--color-text-primary))" }}>
                            {m.payload?.meeting_date ? `${formatMeetingDate(m.payload.meeting_date)}.` : ""} {m.payload?.title}
                          </Typography>
                          <div className="flex gap-5">
                            <button
                              onClick={() => respondMeeting(meetingId, "yes")}
                              className={cn(typography.body, "underline-offset-2 decoration-2")}
                              style={{
                                color: resp === "yes" ? "hsl(var(--primary))" : "hsl(var(--color-text-primary))",
                                textDecoration: resp === "yes" ? "underline" : "none",
                                textDecorationColor: "hsl(var(--color-accent-terra))",
                              }}
                            >
                              Jag kan
                            </button>
                            <button
                              onClick={() => respondMeeting(meetingId, "no")}
                              className={typography.body}
                              style={{
                                color: resp === "no" ? "hsl(var(--primary))" : "hsl(var(--color-text-tertiary))",
                                textDecoration: resp === "no" ? "underline" : "none",
                                textDecorationColor: "hsl(var(--color-accent-terra))",
                                textUnderlineOffset: 2,
                              }}
                            >
                              Kan inte
                            </button>
                          </div>
                        </div>
                        {mine && Avatar}
                      </div>
                    </Fragment>
                  );
                }

                if (m.kind === "photo") {
                  return (
                    <Fragment key={m.id}>
                      {divider}
                      <div className={`flex items-end gap-200 ${mine ? "justify-end" : ""}`}>
                        {!mine && Avatar}
                        <div className="max-w-[70%] rounded-200 overflow-hidden" style={{ backgroundColor: "#EDE4D3" }}>
                          {m.image_url ? (
                            <img src={m.image_url} alt="" className="block w-full h-auto" />
                          ) : (
                            <div className="w-40 h-40" />
                          )}
                        </div>
                        {mine && Avatar}
                      </div>
                    </Fragment>
                  );
                }

                // text
                return (
                  <Fragment key={m.id}>
                    {divider}
                    <div className={`flex items-end gap-200 ${mine ? "justify-end" : ""}`}>
                      {!mine && Avatar}
                      <div
                        className="max-w-[78%] px-300 py-3 rounded-200"
                        style={{
                          backgroundColor: mine ? "hsl(var(--primary))" : "#EFEAE0",
                          color: mine ? "#F0EAE2" : "hsl(var(--color-text-primary))",
                        }}
                      >
                        <Typography variant="body" as="div" className="whitespace-pre-wrap">{m.body}</Typography>
                        <Typography
                          variant="meta"
                          as="div"
                          className={`mt-1 ${mine ? "text-right" : ""}`}
                          style={{ color: mine ? "#E8A87C" : "hsl(var(--color-text-tertiary))" }}
                        >
                          {formatTime(m.created_at)}
                        </Typography>
                      </div>
                      {mine && Avatar}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-300 pt-3 pb-safe" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          {showMeetingForm && (
            <div className="mb-3 rounded-200 p-3 space-y-200" style={{ backgroundColor: "hsl(var(--butter-150))" }}>
              <Typography variant="eyebrow" as="div"  style={{ color: "hsl(var(--color-text-tertiary))" }}>Föreslå en träff</Typography>
              <input
                autoFocus
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="Vad ska ni göra?"
                className={cn(typography.body, "w-full bg-transparent border-0 outline-none")}
                style={{ color: "hsl(var(--color-text-primary))" }}
              />
              <input
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className={cn(typography.body, "w-full bg-transparent border-0 outline-none")}
                style={{ color: "hsl(var(--color-text-primary))" }}
              />
              <div className="flex gap-5 pt-100">
                <TextButton onClick={submitMeetingProposal}>Skicka</TextButton>
                <TextButton variant="secondary" onClick={() => { setShowMeetingForm(false); setMTitle(""); setMDate(""); }}>Avbryt</TextButton>
              </div>
            </div>
          )}
          <div
            className="flex items-center gap-200 rounded-200 px-300 py-200"
            style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(0,0,0,0.12)" }}
          >
            <input
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Skriv något…"
              className={cn(typography.body, "flex-1 bg-transparent border-0 outline-none py-200")}
              style={{ color: "hsl(var(--color-text-primary))" }}
            />
            <button
              onClick={send}
              disabled={!body.trim()}
              aria-label="Skicka"
              className="p-100 disabled:opacity-30"
            >
              <Send className="w-5 h-5" style={{ color: "hsl(var(--color-text-primary))" }} />
            </button>
          </div>
          <div className="flex items-center gap-300 mt-3 pl-200">
            <button
              onClick={() => photoRef.current?.click()}
              aria-label="Skicka bild"
              disabled={uploading}
              className="p-100 disabled:opacity-40"
            >
              <Camera className="w-5 h-5" style={{ color: "hsl(var(--color-text-primary))" }} />
            </button>
            <button
              onClick={() => setShowMeetingForm((s) => !s)}
              aria-label="Föreslå datum"
              className="p-100"
            >
              <CalendarPlus className="w-5 h-5" style={{ color: "hsl(var(--color-text-primary))" }} />
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.currentTarget.value = ""; }}
            />
          </div>
        </div>
      </div>

      <AddToHomeScreenSheet
        open={addHomeOpen}
        onOpenChange={setAddHomeOpen}
        lastSenderName={addHomeSenderName}
      />
    </div>
  );
};

export default ChatPage;
