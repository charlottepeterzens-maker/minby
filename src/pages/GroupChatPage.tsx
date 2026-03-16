import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, SendHorizontal, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import CreatePollSheet from "@/components/chat/CreatePollSheet";
import PollCard from "@/components/chat/PollCard";
import DateSuggestionCard from "@/components/chat/DateSuggestionCard";
import { recognizeDates, type RecognizedDate } from "@/utils/dateRecognition";
import ConfirmSheet from "@/components/ConfirmSheet";
import { toast } from "sonner";

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Member {
  user_id: string;
  display_name: string;
  initial: string;
}

interface Poll {
  id: string;
  group_id: string;
  user_id: string;
  question: string;
  options: string[];
  created_at: string;
}

interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
}

type TimelineItem =
  | { type: "message"; data: Message }
  | { type: "poll"; data: Poll };

interface PendingSuggestion extends RecognizedDate {
  sourceMessageId: string;
  suggestedType: "available" | "confirmed";
}

const DISMISSED_KEY = "dismissed_date_suggestions";

function getDismissedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDismissed(key: string) {
  const set = getDismissedSet();
  set.add(key);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

const GroupChatPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [pollSheetOpen, setPollSheetOpen] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(getDismissedSet);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // --- Data fetching ---
  const fetchGroupInfo = useCallback(async () => {
    if (!groupId) return;
    const { data: group } = await supabase
      .from("friend_groups")
      .select("name")
      .eq("id", groupId)
      .single();
    if (group) setGroupName(group.name);

    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", groupId);

    if (memberships) {
      const ids = memberships.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);

      setMembers(
        (profiles || []).map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name || "Anonym",
          initial: (p.display_name || "A").charAt(0).toUpperCase(),
        }))
      );
    }
  }, [groupId]);

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  }, [groupId]);

  const fetchPolls = useCallback(async () => {
    if (!groupId) return;
    const { data: pollData } = await supabase
      .from("group_polls")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (pollData) {
      setPolls(pollData as Poll[]);
      const pollIds = pollData.map((p) => p.id);
      if (pollIds.length > 0) {
        const { data: voteData } = await supabase
          .from("poll_votes")
          .select("*")
          .in("poll_id", pollIds);
        if (voteData) setPollVotes(voteData as PollVote[]);
      }
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupInfo();
    fetchMessages();
    fetchPolls();
  }, [fetchGroupInfo, fetchMessages, fetchPolls]);

  // --- Realtime ---
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => { setMessages((prev) => [...prev, payload.new as Message]); scrollToBottom(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_polls", filter: `group_id=eq.${groupId}` },
        (payload) => { setPolls((prev) => [...prev, payload.new as Poll]); scrollToBottom(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_votes" },
        (payload) => {
          const nv = payload.new as PollVote;
          setPollVotes((prev) => prev.some((v) => v.id === nv.id) ? prev : [...prev, nv]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  // --- Date recognition with context detection ---
  const activeSuggestion: PendingSuggestion | null = useMemo(() => {
    const pluralPatterns = /\b(vi|oss|alla|tillsammans)\b/i;
    const namePatterns = /\b(och|med|plus|\+)\s+[A-ZÅÄÖ]\w+/i;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const dates = recognizeDates(msg.content);
      for (const d of dates) {
        const key = `${groupId}_${d.startDate}`;
        if (!dismissedSuggestions.has(key)) {
          // Detect if message implies multiple people → plan type
          const impliesGroup = pluralPatterns.test(msg.content) || namePatterns.test(msg.content);
          return { ...d, sourceMessageId: msg.id, suggestedType: impliesGroup ? "confirmed" : "available" };
        }
      }
      if (messages.length - 1 - i > 10) break;
    }
    return null;
  }, [messages, dismissedSuggestions, groupId]);

  const handleDismissSuggestion = () => {
    if (!activeSuggestion) return;
    const key = `${groupId}_${activeSuggestion.startDate}`;
    addDismissed(key);
    setDismissedSuggestions((prev) => new Set([...prev, key]));
  };

  const handleAddToCalendar = async () => {
    if (!activeSuggestion || !user) return;
    const label = activeSuggestion.label || groupName;
    const entryType = activeSuggestion.suggestedType;

    await supabase.from("hangout_availability").insert({
      user_id: user.id,
      date: activeSuggestion.startDate,
      activities: [label],
      custom_note: `Från gruppen "${groupName}"`,
      entry_type: entryType,
    });

    if (activeSuggestion.endDate && activeSuggestion.endDate !== activeSuggestion.startDate) {
      const start = new Date(activeSuggestion.startDate);
      const end = new Date(activeSuggestion.endDate);
      const current = new Date(start);
      current.setDate(current.getDate() + 1);
      while (current <= end) {
        await supabase.from("hangout_availability").insert({
          user_id: user.id,
          date: current.toISOString().split("T")[0],
          activities: [label],
          custom_note: `Från gruppen "${groupName}"`,
          entry_type: entryType,
        });
        current.setDate(current.getDate() + 1);
      }
    }

    handleDismissSuggestion();
  };

  // --- Actions ---
  const handleSend = async () => {
    if (!newMessage.trim() || !user || !groupId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("group_messages").insert({ group_id: groupId, user_id: user.id, content });
    setSending(false);
    inputRef.current?.focus();
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!user || !groupId) return;
    await supabase.from("group_polls").insert({ group_id: groupId, user_id: user.id, question, options });
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    await supabase.from("poll_votes").insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex });
  };

  const getMember = (userId: string) => members.find((m) => m.user_id === userId);
  const formatTime = (dateStr: string) => format(new Date(dateStr), "HH:mm", { locale: sv });

  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({ type: "message" as const, data: m })),
    ...polls.map((p) => ({ type: "poll" as const, data: p })),
  ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime());

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F7F3EF" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center px-4 py-3 gap-3" style={{ backgroundColor: "#3C2A4D" }}>
        <button onClick={() => navigate("/groups")} className="shrink-0 p-1">
          <ChevronLeft className="w-5 h-5" style={{ color: "#C9B8D8" }} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-[13px] font-medium" style={{ color: "#C9B8D8" }}>{groupName}</p>
        </div>
        <div className="shrink-0 flex items-center -space-x-2">
          {members.slice(0, 4).map((m) => (
            <div key={m.user_id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2"
              style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D", borderColor: "#3C2A4D" }}>
              {m.initial}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium border-2"
              style={{ backgroundColor: "#7A6A85", color: "#F7F3EF", borderColor: "#3C2A4D" }}>
              +{members.length - 4}
            </div>
          )}
        </div>
        <button onClick={() => setLeaveConfirmOpen(true)} className="shrink-0 p-1">
          <LogOut className="w-4 h-4" style={{ color: "#C9B8D8" }} />
        </button>
      </header>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {timeline.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[13px]" style={{ color: "#7A6A85" }}>Inga meddelanden ännu. Skriv det första!</p>
          </div>
        )}

        {timeline.map((item) => {
          if (item.type === "message") {
            const msg = item.data;
            const isOwn = msg.user_id === user?.id;
            const member = getMember(msg.user_id);
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <div className="px-3 py-2" style={{
                  maxWidth: 200,
                  borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  backgroundColor: isOwn ? "#3C2A4D" : "#FFFFFF",
                  color: isOwn ? "#FFFFFF" : "#3C2A4D",
                  border: isOwn ? "none" : "0.5px solid #EDE8F4",
                  fontSize: 13, lineHeight: "18px",
                }}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  {!isOwn && <span className="text-[10px]" style={{ color: "#7A6A85" }}>{member?.display_name || "Anonym"}</span>}
                  <span className="text-[10px]" style={{ color: "#9B8BA5" }}>{formatTime(msg.created_at)}</span>
                </div>
              </div>
            );
          }
          const poll = item.data as Poll;
          const votes = pollVotes.filter((v) => v.poll_id === poll.id);
          const creator = getMember(poll.user_id);
          return (
            <PollCard key={poll.id} question={poll.question} options={poll.options} votes={votes}
              currentUserId={user?.id || ""} onVote={(idx) => handleVote(poll.id, idx)}
              creatorName={creator?.display_name || "Anonym"} time={formatTime(poll.created_at)} />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Date suggestion */}
      {activeSuggestion && (
        <DateSuggestionCard
          startDate={activeSuggestion.startDate}
          endDate={activeSuggestion.endDate}
          label={activeSuggestion.label}
          groupName={groupName}
          suggestedType={activeSuggestion.suggestedType}
          onAdd={handleAddToCalendar}
          onDismiss={handleDismissSuggestion}
        />
      )}

      {/* Input field */}
      <div className="sticky bottom-0 px-4 py-3 safe-area-bottom" style={{ backgroundColor: "#F7F3EF" }}>
        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: "#FFFFFF", borderRadius: 20, border: "0.5px solid #EDE8F4" }}>
          <button onClick={() => setPollSheetOpen(true)} className="shrink-0 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" style={{ color: "#3C2A4D" }} />
          </button>
          <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Skriv något..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9B8BA5]" style={{ color: "#3C2A4D" }} />
          <button onClick={handleSend} disabled={!newMessage.trim() || sending}
            className="shrink-0 flex items-center justify-center rounded-full disabled:opacity-40 transition-opacity"
            style={{ width: 32, height: 32, backgroundColor: "#3C2A4D" }}>
            <SendHorizontal className="w-4 h-4" style={{ color: "#FFFFFF" }} />
          </button>
        </div>
      </div>

      <CreatePollSheet open={pollSheetOpen} onOpenChange={setPollSheetOpen} onSubmit={handleCreatePoll} sending={sending} />
      <ConfirmSheet
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Lämna grupp"
        description="Är du säker på att du vill lämna gruppen?"
        confirmLabel="Lämna"
        onConfirm={async () => {
          if (!user || !groupId) return;
          await supabase.from("group_memberships").delete().eq("group_id", groupId).eq("user_id", user.id);
          toast.success("Du har lämnat gruppen");
          navigate("/groups");
        }}
      />
    </div>
  );
};

export default GroupChatPage;
