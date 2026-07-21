import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, Send } from "lucide-react";
import { toast } from "sonner";

interface Message { id: string; user_id: string | null; body: string | null; created_at: string; }

const ChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [circleName, setCircleName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase.from("circles").select("name").eq("id", id).maybeSingle();
      setCircleName(c?.name ?? "");
      const { data, error } = await supabase.from("messages")
        .select("id, user_id, body, created_at")
        .eq("circle_id", id).order("created_at", { ascending: true }).limit(200);
      if (error) toast.error(error.message);
      else setMessages(data ?? []);
    })();

    const channel = supabase
      .channel(`messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `circle_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!id || !user || !body.trim()) return;
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("messages").insert({ circle_id: id, user_id: user.id, body: text });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 pt-safe max-w-lg w-full mx-auto">
        <button onClick={() => navigate(`/circle/${id}`)} aria-label="Tillbaka" className="p-2 -ml-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg">{circleName}</h1>
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg w-full mx-auto px-5 py-2 space-y-2">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">Inga meddelanden än. Säg något.</p>
        ) : messages.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "" : "bg-card text-foreground"}`}
                style={mine ? { backgroundColor: "#561828", color: "#F0EAE2" } : undefined}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="max-w-lg w-full mx-auto px-3 pb-safe" style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}>
        <div className="flex items-end gap-2 bg-card rounded-lg p-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Skriv…"
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 outline-none text-sm px-2 py-2 max-h-32"
          />
          <button onClick={send} disabled={!body.trim()} aria-label="Skicka"
            className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-40"
            style={{ backgroundColor: "#561828", color: "#F0EAE2" }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
