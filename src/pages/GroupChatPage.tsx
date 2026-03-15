import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, SendHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

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

const GroupChatPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

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

  useEffect(() => {
    fetchGroupInfo();
    fetchMessages();
  }, [fetchGroupInfo, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !groupId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: user.id,
      content,
    });

    setSending(false);
    inputRef.current?.focus();
  };

  const getMember = (userId: string) =>
    members.find((m) => m.user_id === userId);

  const formatTime = (dateStr: string) =>
    format(new Date(dateStr), "HH:mm", { locale: sv });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F7F3EF" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center px-4 py-3 gap-3"
        style={{ backgroundColor: "#3C2A4D" }}
      >
        <button
          onClick={() => navigate("/groups")}
          className="shrink-0 p-1"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "#C9B8D8" }} />
        </button>

        <div className="flex-1 text-center">
          <p
            className="text-[13px] font-medium"
            style={{ color: "#C9B8D8" }}
          >
            {groupName}
          </p>
        </div>

        {/* Overlapping avatars */}
        <div className="shrink-0 flex items-center -space-x-2">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.user_id}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2"
              style={{
                backgroundColor: "#C9B8D8",
                color: "#3C2A4D",
                borderColor: "#3C2A4D",
              }}
            >
              {m.initial}
            </div>
          ))}
          {members.length > 4 && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium border-2"
              style={{
                backgroundColor: "#7A6A85",
                color: "#F7F3EF",
                borderColor: "#3C2A4D",
              }}
            >
              +{members.length - 4}
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[13px]" style={{ color: "#7A6A85" }}>
              Inga meddelanden ännu. Skriv det första!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          const member = getMember(msg.user_id);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <div
                className="px-3 py-2"
                style={{
                  maxWidth: 200,
                  borderRadius: isOwn
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                  backgroundColor: isOwn ? "#3C2A4D" : "#FFFFFF",
                  color: isOwn ? "#FFFFFF" : "#3C2A4D",
                  border: isOwn ? "none" : "0.5px solid #DDD5CC",
                  fontSize: 13,
                  lineHeight: "18px",
                }}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-1.5 mt-1 px-1">
                {!isOwn && (
                  <span
                    className="text-[10px]"
                    style={{ color: "#7A6A85" }}
                  >
                    {member?.display_name || "Anonym"}
                  </span>
                )}
                <span className="text-[10px]" style={{ color: "#9B8BA5" }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input field */}
      <div
        className="sticky bottom-0 px-4 py-3 safe-area-bottom"
        style={{ backgroundColor: "#F7F3EF" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            border: "0.5px solid #DDD5CC",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Skriv något..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9B8BA5]"
            style={{ color: "#3C2A4D" }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="shrink-0 flex items-center justify-center rounded-full disabled:opacity-40 transition-opacity"
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#3C2A4D",
            }}
          >
            <SendHorizontal className="w-4 h-4" style={{ color: "#FFFFFF" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatPage;
