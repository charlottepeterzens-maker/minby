import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Send, Camera, CalendarPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import TextButton from "@/components/ui/text-button";
import { OVERLAY_GRADIENT } from "@/lib/card-styles";


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
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meetingResponses, setMeetingResponses] = useState<Record<string, "yes" | "no" | undefined>>({});
  const [body, setBody] = useState("");
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
      const [{ data: c }, { data: mems }, { data: msgs }, { data: sum }] = await Promise.all([
        supabase.from("circles").select("id, name, hero_image_url").eq("id", id).maybeSingle(),
        supabase.from("circle_members").select("user_id").eq("circle_id", id),
        supabase.from("messages").select("id, user_id, body, kind, payload, created_at").eq("circle_id", id).order("created_at", { ascending: true }).limit(200),
        supabase.from("circle_ai_summary").select("content").eq("circle_id", id).maybeSingle(),
      ]);
      setCircle(c as Circle | null);
      const memberIds = (mems ?? []).map((m) => m.user_id);
      if (memberIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", memberIds);
        setMembers((profs ?? []) as Member[]);
      }
      const signed = await signImageMessages((msgs ?? []) as Message[]);
      setMessages(signed);
      if (sum?.content) setSummary(sum.content);

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

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
          backgroundColor: "#8b6f5e",
          backgroundImage: circle?.hero_image_url ? `url(${circle.hero_image_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: OVERLAY_GRADIENT.heroSubtle }} />
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <h1 className="text-heading-lg" style={{ fontSize: 28, fontWeight: 500 }}>{circle?.name ?? ""}</h1>
          {memberPreview && <p className="text-[13px] opacity-90 mt-1 truncate">{memberPreview}</p>}
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
        <header className="relative flex items-center justify-center px-5 pt-4 pb-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={() => navigate(`/circle/${id}`)} aria-label="Stäng" className="absolute left-4 p-1">
            <X className="w-5 h-5" style={{ color: "#2B2B2B" }} />
          </button>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 600, color: "#2B2B2B" }}>Chatt</h2>
          <button
            onClick={runSummarize}
            aria-label="Sammanfatta chatten"
            className="absolute right-4 p-1 flex items-center gap-1"
            style={{ color: "#561828" }}
            disabled={summarizing}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </header>

        {summaryOpen && (
          <div className="mx-4 mt-3 rounded-[20px] p-4 relative" style={{ backgroundColor: "#561828", color: "#F0EAE2" }}>
            <button onClick={() => setSummaryOpen(false)} className="absolute top-2 right-2 p-1 opacity-80" aria-label="Stäng">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] uppercase tracking-wider">AI-sammanfattning</span>
            </div>
            {summarizing ? (
              <p className="text-[16px] opacity-80">Läser chatten…</p>
            ) : (
              <p className="text-[16px] leading-snug whitespace-pre-wrap">{summary}</p>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">Säg något så börjar det.</p>
          )}
          {grouped.map((g, gi) => (
            <div key={gi} className="space-y-3">
              <div className="text-center">
                <span className="text-[11px]" style={{ color: "#675332" }}>{g.day}</span>
              </div>
              {g.items.map((m) => {
                const mine = m.user_id === user?.id;
                const avatar = avatarMap.get(m.user_id ?? "");
                const initial = (nameMap.get(m.user_id ?? "") ?? "?").charAt(0).toUpperCase();
                const Avatar = (
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: "#DCEAF8" }}
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[13px]" style={{ color: "#2B2B2B" }}>{initial}</span>
                    )}
                  </div>
                );

                if (m.kind === "meeting_proposal") {
                  const meetingId = m.payload?.meeting_id as string;
                  const resp = meetingResponses[meetingId];
                  return (
                    <div key={m.id} className="flex items-end gap-2">
                      {!mine && Avatar}
                      <div
                        className="max-w-[78%] rounded-[20px] p-4"
                        style={{ backgroundColor: "#F5EFD9" }}
                      >
                        <div className="text-eyebrow mb-1" style={{ color: "#675332", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 10 }}>
                          Förslag att ses
                        </div>
                        <div className="text-[17px] leading-tight mb-3" style={{ color: "#2B2B2B", fontWeight: 500 }}>
                          {m.payload?.meeting_date ? `${formatMeetingDate(m.payload.meeting_date)}.` : ""} {m.payload?.title}
                        </div>
                        <div className="flex gap-5">
                          <button
                            onClick={() => respondMeeting(meetingId, "yes")}
                            className="text-[15px] font-medium underline-offset-2 decoration-2"
                            style={{
                              color: resp === "yes" ? "#561828" : "#2B2B2B",
                              textDecoration: resp === "yes" ? "underline" : "none",
                              textDecorationColor: "#C85A2E",
                            }}
                          >
                            Jag kan
                          </button>
                          <button
                            onClick={() => respondMeeting(meetingId, "no")}
                            className="text-[15px]"
                            style={{
                              color: resp === "no" ? "#561828" : "#675332",
                              textDecoration: resp === "no" ? "underline" : "none",
                              textDecorationColor: "#C85A2E",
                              textUnderlineOffset: 2,
                            }}
                          >
                            Kan inte
                          </button>
                        </div>
                      </div>
                      {mine && Avatar}
                    </div>
                  );
                }

                if (m.kind === "photo") {
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
                      {!mine && Avatar}
                      <div className="max-w-[70%] rounded-[20px] overflow-hidden" style={{ backgroundColor: "#EDE4D3" }}>
                        {m.image_url ? (
                          <img src={m.image_url} alt="" className="block w-full h-auto" />
                        ) : (
                          <div className="w-40 h-40" />
                        )}
                      </div>
                      {mine && Avatar}
                    </div>
                  );
                }

                // text
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
                    {!mine && Avatar}
                    <div
                      className="max-w-[78%] px-4 py-3 rounded-[20px]"
                      style={{
                        backgroundColor: mine ? "#561828" : "#EFEAE0",
                        color: mine ? "#F0EAE2" : "#2B2B2B",
                      }}
                    >
                      <div className="text-[16px] leading-snug whitespace-pre-wrap">{m.body}</div>
                      <div
                        className={`text-[11px] mt-1 ${mine ? "text-right" : ""}`}
                        style={{ color: mine ? "#E8A87C" : "#675332" }}
                      >
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                    {mine && Avatar}
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-4 pt-3 pb-safe" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          {showMeetingForm && (
            <div className="mb-3 rounded-[20px] p-3 space-y-2" style={{ backgroundColor: "#F5EFD9" }}>
              <div className="text-eyebrow" style={{ color: "#675332", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 10 }}>Föreslå en träff</div>
              <input
                autoFocus
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="Vad ska ni göra?"
                className="w-full bg-transparent border-0 outline-none text-[15px]"
                style={{ color: "#2B2B2B" }}
              />
              <input
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-[16px]"
                style={{ color: "#2B2B2B" }}
              />
              <div className="flex gap-5 pt-1">
                <TextButton onClick={submitMeetingProposal}>Skicka</TextButton>
                <TextButton variant="secondary" onClick={() => { setShowMeetingForm(false); setMTitle(""); setMDate(""); }}>Avbryt</TextButton>
              </div>
            </div>
          )}
          <div
            className="flex items-center gap-2 rounded-[20px] px-4 py-2"
            style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(0,0,0,0.12)" }}
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Skriv något…"
              className="flex-1 bg-transparent border-0 outline-none text-[15px] py-2"
              style={{ color: "#2B2B2B" }}
            />
            <button
              onClick={send}
              disabled={!body.trim()}
              aria-label="Skicka"
              className="p-1 disabled:opacity-30"
            >
              <Send className="w-5 h-5" style={{ color: "#2B2B2B" }} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-3 pl-2">
            <button
              onClick={() => photoRef.current?.click()}
              aria-label="Skicka bild"
              disabled={uploading}
              className="p-1 disabled:opacity-40"
            >
              <Camera className="w-5 h-5" style={{ color: "#2B2B2B" }} />
            </button>
            <button
              onClick={() => setShowMeetingForm((s) => !s)}
              aria-label="Föreslå datum"
              className="p-1"
            >
              <CalendarPlus className="w-5 h-5" style={{ color: "#2B2B2B" }} />
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
    </div>
  );
};

export default ChatPage;
