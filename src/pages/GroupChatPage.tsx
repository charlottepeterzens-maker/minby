import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, SendHorizontal, Plus, EllipsisVertical, UserPlus, ArrowUpFromLine, LogOut, Reply, X, SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import CreateActionSheet from "@/components/chat/CreateActionSheet";
import PollCard from "@/components/chat/PollCard";
import PlanTimelineCard from "@/components/chat/PlanTimelineCard";
import ChatSummaryCard from "@/components/chat/ChatSummaryCard";
import AfterEventCard from "@/components/chat/AfterEventCard";
import DateSuggestionCard from "@/components/chat/DateSuggestionCard";
import GroupStatusLine from "@/components/chat/GroupStatusLine";
import MessageReactions from "@/components/chat/MessageReactions";
import { recognizeDates, type RecognizedDate } from "@/utils/dateRecognition";
import ConfirmSheet from "@/components/ConfirmSheet";
import AddMemberSheet from "@/components/chat/AddMemberSheet";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import { toast } from "sonner";
import { sendNotification } from "@/utils/notifications";

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_to_id: string | null;
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

interface Plan {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  date_text: string;
  location: string | null;
  emoji: string;
  created_at: string;
}

interface Rsvp {
  id: string;
  plan_id: string;
  user_id: string;
  status: string;
}

type TimelineItem =
  | { type: "message"; data: Message }
  | { type: "poll"; data: Poll }
  | { type: "plan"; data: Plan };

interface PendingSuggestion extends RecognizedDate {
  sourceMessageId: string;
  suggestedType: "available" | "confirmed";
}

const DISMISSED_KEY = "dismissed_date_suggestions";
const DISMISSED_MEMORIES_KEY = "dismissed_memory_prompts";

function getDismissedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addToDismissed(key: string, val: string) {
  const set = getDismissedSet(key);
  set.add(val);
  localStorage.setItem(key, JSON.stringify([...set]));
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [actionSheetPrefill, setActionSheetPrefill] = useState<{ title: string; dateText: string } | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(getDismissedSet(DISMISSED_KEY));
  const [dismissedMemories, setDismissedMemories] = useState<Set<string>>(getDismissedSet(DISMISSED_MEMORIES_KEY));
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messageReactions, setMessageReactions] = useState<MessageReaction[]>([]);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // --- Data fetching ---
  const fetchGroupInfo = useCallback(async () => {
    if (!groupId) return;
    const { data: group } = await supabase
      .from("friend_groups").select("name").eq("id", groupId).single();
    if (group) setGroupName(group.name);

    const { data: memberships } = await supabase
      .from("group_memberships").select("user_id").eq("group_id", groupId);
    if (memberships) {
      const ids = memberships.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", ids);
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
      .from("group_messages").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (data) { setMessages(data); scrollToBottom(); }
  }, [groupId]);

  const fetchPolls = useCallback(async () => {
    if (!groupId) return;
    const { data: pollData } = await supabase
      .from("group_polls").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (pollData) {
      setPolls(pollData as Poll[]);
      const pollIds = pollData.map((p) => p.id);
      if (pollIds.length > 0) {
        const { data: voteData } = await supabase
          .from("poll_votes").select("*").in("poll_id", pollIds);
        if (voteData) setPollVotes(voteData as PollVote[]);
      }
    }
  }, [groupId]);

  const fetchPlans = useCallback(async () => {
    if (!groupId) return;
    const { data: planData } = await supabase
      .from("plans").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (planData) {
      setPlans(planData as Plan[]);
      const planIds = planData.map((p) => p.id);
      if (planIds.length > 0) {
        const { data: rsvpData } = await supabase
          .from("rsvps").select("*").in("plan_id", planIds);
        if (rsvpData) setRsvps(rsvpData as Rsvp[]);
      }
    }
  }, [groupId]);

  const fetchReactions = useCallback(async () => {
    if (!groupId) return;
    // Fetch reactions for all messages in this group
    const msgIds = messages.map((m) => m.id);
    if (msgIds.length === 0) { setMessageReactions([]); return; }
    const { data } = await (supabase as any)
      .from("message_reactions").select("*").in("message_id", msgIds);
    if (data) setMessageReactions(data as MessageReaction[]);
  }, [groupId, messages]);

  useEffect(() => {
    fetchGroupInfo();
    fetchMessages();
    fetchPolls();
    fetchPlans();
  }, [fetchGroupInfo, fetchMessages, fetchPolls, fetchPlans]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "plans", filter: `group_id=eq.${groupId}` },
        (payload) => { setPlans((prev) => [...prev, payload.new as Plan]); scrollToBottom(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rsvps" },
        (payload) => {
          const nr = payload.new as Rsvp;
          setRsvps((prev) => prev.some((r) => r.id === nr.id) ? prev : [...prev, nr]);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const nr = payload.new as MessageReaction;
            setMessageReactions((prev) => prev.some((r) => r.id === nr.id) ? prev : [...prev, nr]);
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setMessageReactions((prev) => prev.filter((r) => r.id !== old.id));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  // --- Date recognition ---
  const activeSuggestion: PendingSuggestion | null = useMemo(() => {
    const pluralPatterns = /\b(vi|oss|alla|tillsammans)\b/i;
    const namePatterns = /\b(och|med|plus|\+)\s+[A-ZÅÄÖ]\w+/i;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const dates = recognizeDates(msg.content);
      for (const d of dates) {
        const key = `${groupId}_${d.startDate}`;
        if (!dismissedSuggestions.has(key)) {
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
    addToDismissed(DISMISSED_KEY, key);
    setDismissedSuggestions((prev) => new Set([...prev, key]));
  };

  const handleAddToCalendar = async () => {
    if (!activeSuggestion || !user) return;
    const label = activeSuggestion.label || groupName;
    const entryType = activeSuggestion.suggestedType;
    await supabase.from("hangout_availability").insert({
      user_id: user.id, date: activeSuggestion.startDate,
      activities: [label], custom_note: `Från gruppen "${groupName}"`, entry_type: entryType,
    });
    if (activeSuggestion.endDate && activeSuggestion.endDate !== activeSuggestion.startDate) {
      const start = new Date(activeSuggestion.startDate);
      const end = new Date(activeSuggestion.endDate);
      const current = new Date(start);
      current.setDate(current.getDate() + 1);
      while (current <= end) {
        await supabase.from("hangout_availability").insert({
          user_id: user.id, date: current.toISOString().split("T")[0],
          activities: [label], custom_note: `Från gruppen "${groupName}"`, entry_type: entryType,
        });
        current.setDate(current.getDate() + 1);
      }
    }
    handleDismissSuggestion();
  };

  // --- Past plans for after-event ---
  const pastPlanForMemory = useMemo(() => {
    const now = new Date();
    const pastKeywords = ["igår", "förra", "i lördags", "i söndags"];
    return plans.find((p) => {
      if (dismissedMemories.has(p.id)) return false;
      // Simple heuristic: plan date_text contains past-like words or created > 1 day ago with rsvps
      const createdAt = new Date(p.created_at);
      const daysSince = (now.getTime() - createdAt.getTime()) / 86400000;
      const hasRsvps = rsvps.filter((r) => r.plan_id === p.id && r.status === "in").length >= 2;
      const looksOld = daysSince > 2 && hasRsvps;
      const textLooksPast = pastKeywords.some((k) => p.date_text.toLowerCase().includes(k));
      return looksOld || textLooksPast;
    }) || null;
  }, [plans, rsvps, dismissedMemories]);

  // --- Latest plan status for header ---
  const latestPlanStatus = useMemo(() => {
    if (plans.length === 0) return null;
    const latest = plans[plans.length - 1];
    const planRsvps = rsvps.filter((r) => r.plan_id === latest.id);
    return {
      title: latest.title,
      dateText: latest.date_text,
      rsvpInCount: planRsvps.filter((r) => r.status === "in").length,
      rsvpMaybeCount: planRsvps.filter((r) => r.status === "maybe").length,
    };
  }, [plans, rsvps]);

  // --- Actions ---
  const handleSend = async () => {
    if (!newMessage.trim() || !user || !groupId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    const replyId = replyTo?.id || null;
    setNewMessage("");
    setReplyTo(null);
    await (supabase as any).from("group_messages").insert({ group_id: groupId, user_id: user.id, content, reply_to_id: replyId });
    try {
      const otherMembers = members.filter(m => m.user_id !== user.id);
      if (otherMembers.length > 0) {
        await Promise.all(otherMembers.map(m =>
          sendNotification({ recipientUserId: m.user_id, fromUserId: user.id, type: "group_message", referenceId: groupId, message: `Nytt meddelande i ${groupName}` })
        ));
      }
    } catch { /* best effort */ }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!user || !groupId) return;
    await supabase.from("group_polls").insert({ group_id: groupId, user_id: user.id, question, options });
  };

  const handleCreatePlan = async (title: string, dateText: string, location: string | null) => {
    if (!user || !groupId) return;
    const { data: plan } = await supabase.from("plans").insert({
      group_id: groupId, created_by: user.id, title, date_text: dateText,
      location, emoji: "📅", vibe: "chill",
    }).select("id").single();

    if (plan) {
      // Auto-RSVP creator
      await supabase.from("rsvps").insert({ plan_id: plan.id, user_id: user.id, status: "in" });
      // Bridge to profile "Ses vi?"
      await supabase.from("hangout_availability").insert({
        user_id: user.id,
        date: new Date().toISOString().split("T")[0],
        activities: [title],
        custom_note: `${dateText}${location ? ` · ${location}` : ""} — via ${groupName}`,
        entry_type: "confirmed",
      });
    }
  };

  const handleRsvp = async (planId: string, status: string) => {
    if (!user) return;
    const existing = rsvps.find((r) => r.plan_id === planId && r.user_id === user.id);
    if (existing) return;
    await supabase.from("rsvps").insert({ plan_id: planId, user_id: user.id, status });

    // Bridge to profile "Ses vi?" when user says "Jag kan" or "Kanske"
    if (status === "in" || status === "maybe") {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        await supabase.from("hangout_availability").insert({
          user_id: user.id,
          date: new Date().toISOString().split("T")[0],
          activities: [plan.title],
          custom_note: `${plan.date_text}${plan.location ? ` · ${plan.location}` : ""} — via ${groupName}`,
          entry_type: status === "in" ? "confirmed" : "available",
        });
      }
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    await supabase.from("poll_votes").insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex });
  };

  const handleSummaryCreatePlan = (suggestion: { title: string; dateText: string }) => {
    setActionSheetPrefill(suggestion);
    setActionSheetOpen(true);
  };

  const getMember = (userId: string) => members.find((m) => m.user_id === userId);
  const formatTime = (dateStr: string) => format(new Date(dateStr), "HH:mm", { locale: sv });

  // --- Summary messages for AI ---
  const summaryMessages = useMemo(() => {
    return messages.slice(-30).map((m) => ({
      sender: getMember(m.user_id)?.display_name || "Anonym",
      content: m.content,
    }));
  }, [messages, members]);

  const timeline: TimelineItem[] = useMemo(() => [
    ...messages.map((m) => ({ type: "message" as const, data: m })),
    ...polls.map((p) => ({ type: "poll" as const, data: p })),
    ...plans.map((p) => ({ type: "plan" as const, data: p })),
  ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime()), [messages, polls, plans]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ backgroundColor: "#3C2A4D" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/groups")} className="shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Tillbaka till sällskap">
            <ChevronLeft className="w-5 h-5" style={{ color: "hsl(var(--color-border-lavender))" }} />
          </button>
          <div className="flex-1 text-center min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-border-lavender))" }}>{groupName}</p>
            {latestPlanStatus && (
              <GroupStatusLine
                memberCount={members.length}
                latestPlan={latestPlanStatus}
                lastMessageAt={messages[messages.length - 1]?.created_at}
                compact
              />
            )}
          </div>
          <div className="shrink-0 flex items-center -space-x-2">
            {members.slice(0, 4).map((m) => (
              <div key={m.user_id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2"
                style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))", borderColor: "hsl(var(--color-text-primary))" }}>
                {m.initial}
              </div>
            ))}
            {members.length > 4 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium border-2"
                style={{ backgroundColor: "#655675", color: "#F7F3EF", borderColor: "hsl(var(--color-text-primary))" }}>
                +{members.length - 4}
              </div>
            )}
          </div>
          <div className="shrink-0 relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Gruppinställningar">
              <EllipsisVertical className="w-5 h-5" style={{ color: "hsl(var(--color-border-lavender))" }} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 py-1.5 rounded-[12px] shadow-lg min-w-[180px]"
                  style={{ backgroundColor: "hsl(var(--color-surface-card))", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                  <button onClick={() => { setMenuOpen(false); setAddMemberOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium hover:opacity-80"
                    style={{ color: "hsl(var(--color-text-primary))" }}>
                    <UserPlus className="w-4 h-4" style={{ color: "hsl(var(--color-text-secondary))" }} />
                    Lägg till vän
                  </button>
                  <InviteFriendDialog trigger={
                    <button onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium hover:opacity-80"
                      style={{ color: "hsl(var(--color-text-primary))" }}>
                      <ArrowUpFromLine className="w-4 h-4" style={{ color: "hsl(var(--color-text-secondary))" }} />
                      Bjud in till sällskapet
                    </button>
                  } />
                  <div className="mx-3 my-1" style={{ borderTop: "1px solid #F0ECE7" }} />
                  <button onClick={() => { setMenuOpen(false); setLeaveConfirmOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium hover:opacity-80"
                    style={{ color: "hsl(var(--color-accent-red))" }}>
                    <LogOut className="w-4 h-4" style={{ color: "hsl(var(--color-accent-red))" }} />
                    Lämna grupp
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Timeline with sticky summary */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 relative">
        <ChatSummaryCard
          messages={summaryMessages}
          members={members}
          groupName={groupName}
          onCreatePlan={handleSummaryCreatePlan}
          totalMessageCount={messages.length}
        />

        {pastPlanForMemory && (
          <AfterEventCard
            planId={pastPlanForMemory.id}
            planTitle={pastPlanForMemory.title}
            planDate={pastPlanForMemory.date_text}
            groupId={groupId || ""}
            onDismiss={() => {
              addToDismissed(DISMISSED_MEMORIES_KEY, pastPlanForMemory.id);
              setDismissedMemories((prev) => new Set([...prev, pastPlanForMemory.id]));
            }}
            onMemorySaved={() => {
              addToDismissed(DISMISSED_MEMORIES_KEY, pastPlanForMemory.id);
              setDismissedMemories((prev) => new Set([...prev, pastPlanForMemory.id]));
            }}
          />
        )}
        {timeline.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[13px]" style={{ color: "hsl(var(--color-text-secondary))" }}>Inga meddelanden ännu. Skriv det första!</p>
          </div>
        )}

        {timeline.map((item) => {
          if (item.type === "message") {
            const msg = item.data;
            const isOwn = msg.user_id === user?.id;
            const member = getMember(msg.user_id);
            const repliedMsg = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;
            const repliedMember = repliedMsg ? getMember(repliedMsg.user_id) : null;
            const msgReactions = messageReactions.filter((r) => r.message_id === msg.id);
            const showPicker = reactionPickerMsgId === msg.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"} group`}>
                {repliedMsg && (
                  <div className="flex items-center gap-1 px-2 mb-0.5" style={{ maxWidth: 200 }}>
                    <Reply className="w-3 h-3 shrink-0" style={{ color: "hsl(var(--color-text-muted))", transform: "scaleX(-1)" }} />
                    <span className="text-[10px] truncate" style={{ color: "hsl(var(--color-text-muted))" }}>
                      {repliedMember?.display_name || "Anonym"}: {repliedMsg.content}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {isOwn && (
                    <>
                      <button
                        onClick={() => setReactionPickerMsgId(showPicker ? null : msg.id)}
                        className="opacity-0 group-hover:opacity-60 active:opacity-100 transition-opacity p-1 rounded-full"
                        style={{ color: "hsl(var(--color-text-muted))" }}
                      >
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                        className="opacity-0 group-hover:opacity-60 active:opacity-100 transition-opacity p-1 rounded-full"
                        style={{ color: "hsl(var(--color-text-muted))" }}
                      >
                        <Reply className="w-3.5 h-3.5" style={{ transform: "scaleX(-1)" }} />
                      </button>
                    </>
                  )}
                  <div
                    onDoubleClick={() => setReactionPickerMsgId(showPicker ? null : msg.id)}
                    className="px-3 py-2 select-none"
                    style={{
                      maxWidth: 200,
                      borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      backgroundColor: isOwn ? "#3C2A4D" : "#FFFFFF",
                      color: isOwn ? "#FFFFFF" : "#3C2A4D",
                      border: isOwn ? "none" : "none",
                      fontSize: 13, lineHeight: "18px",
                    }}
                  >
                    {msg.content}
                  </div>
                  {!isOwn && (
                    <>
                      <button
                        onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                        className="opacity-0 group-hover:opacity-60 active:opacity-100 transition-opacity p-1 rounded-full"
                        style={{ color: "hsl(var(--color-text-muted))" }}
                      >
                        <Reply className="w-3.5 h-3.5" style={{ transform: "scaleX(-1)" }} />
                      </button>
                      <button
                        onClick={() => setReactionPickerMsgId(showPicker ? null : msg.id)}
                        className="opacity-0 group-hover:opacity-60 active:opacity-100 transition-opacity p-1 rounded-full"
                        style={{ color: "hsl(var(--color-text-muted))" }}
                      >
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <MessageReactions
                  messageId={msg.id}
                  isOwn={isOwn}
                  reactions={msgReactions}
                  onReactionsChange={fetchReactions}
                  pickerOpen={showPicker}
                  onPickerToggle={(open) => setReactionPickerMsgId(open ? msg.id : null)}
                />
                <div className="flex items-center gap-1.5 mt-0.5 px-1">
                  {!isOwn && <span className="text-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>{member?.display_name || "Anonym"}</span>}
                  <span className="text-[10px]" style={{ color: "hsl(var(--color-text-muted))" }}>{formatTime(msg.created_at)}</span>
                </div>
              </div>
            );
          }

          if (item.type === "plan") {
            const plan = item.data as Plan;
            const planRsvps = rsvps.filter((r) => r.plan_id === plan.id);
            const creator = getMember(plan.created_by);
            return (
              <PlanTimelineCard
                key={`plan-${plan.id}`}
                planId={plan.id}
                title={plan.title}
                dateText={plan.date_text}
                location={plan.location}
                
                creatorName={creator?.display_name || "Anonym"}
                time={formatTime(plan.created_at)}
                rsvps={planRsvps}
                currentUserId={user?.id || ""}
                members={members}
                onRsvp={handleRsvp}
              />
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
      <div className="sticky bottom-0 px-4 py-3 safe-area-bottom" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        {replyTo && (
          <div className="flex items-center gap-2 px-4 py-1.5 mb-1 rounded-t-[12px]" style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}>
            <Reply className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--color-text-secondary))", transform: "scaleX(-1)" }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-medium block" style={{ color: "hsl(var(--color-text-primary))" }}>
                {getMember(replyTo.user_id)?.display_name || "Anonym"}
              </span>
              <span className="text-[11px] truncate block" style={{ color: "hsl(var(--color-text-secondary))" }}>
                {replyTo.content}
              </span>
            </div>
            <button onClick={() => setReplyTo(null)} className="shrink-0 p-0.5">
              <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--color-text-secondary))" }} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 20 }}>
          <button onClick={() => { setActionSheetPrefill(null); setActionSheetOpen(true); }} className="shrink-0 flex items-center justify-center">
            <Plus className="w-5 h-5" style={{ color: "hsl(var(--color-text-primary))" }} />
          </button>
          <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={replyTo ? "Svara..." : "Skriv något..."}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#6B5C78]" style={{ color: "hsl(var(--color-text-primary))" }} />
          <button onClick={handleSend} disabled={!newMessage.trim() || sending}
            className="shrink-0 flex items-center justify-center rounded-full disabled:opacity-40 transition-opacity"
            style={{ width: 32, height: 32, backgroundColor: "#3C2A4D" }}>
            <SendHorizontal className="w-4 h-4" style={{ color: "#FFFFFF" }} />
          </button>
        </div>
      </div>

      <CreateActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        onSubmitPoll={handleCreatePoll}
        onSubmitPlan={handleCreatePlan}
        sending={sending}
        prefill={actionSheetPrefill}
      />
      <ConfirmSheet
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Lämna grupp"
        description={`Är du säker på att du vill lämna ${groupName}?`}
        confirmLabel="Lämna"
        onConfirm={async () => {
          if (!user || !groupId) return;
          await supabase.from("group_memberships").delete().eq("group_id", groupId).eq("user_id", user.id);
          toast.success("Du har lämnat gruppen");
          navigate("/groups");
        }}
      />
      <AddMemberSheet
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        groupId={groupId || ""}
        groupName={groupName}
        existingMemberIds={members.map((m) => m.user_id)}
        onMembersAdded={fetchGroupInfo}
      />
    </div>
  );
};

export default GroupChatPage;
