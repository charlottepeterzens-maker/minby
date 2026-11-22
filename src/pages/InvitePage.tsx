import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Typography } from "@/components/ui/typography";

interface Member { display_name: string | null; avatar_url: string | null }
interface RecentMessage { id: string; sender_name: string; kind: string; body: string | null; meeting_title: string | null }

const initials = (name: string | null) => {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
};

const messageText = (m: RecentMessage) => {
  if (m.kind === "meeting_proposal") return `föreslår att ses: ${m.meeting_title ?? ""}`;
  if (m.kind === "photo") return "skickade en bild";
  return m.body ?? "";
};

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "invalid" | "expired" | "accepted">("loading");
  const [circleName, setCircleName] = useState("");
  const [circleId, setCircleId] = useState("");
  const [inviterName, setInviterName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestReply, setGuestReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const acceptedRef = useRef(false);
  const pendingReplyRef = useRef<string | null>(null);

  // Preview
  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-invite-preview", { body: { token } });
      if (error || !data?.ok) { setStatus(data?.status === "expired" ? "expired" : "invalid"); return; }
      setCircleName(data.circle_name);
      setCircleId(data.circle_id);
      setInviterName(data.inviter_name ?? "Någon");
      setMembers(data.members ?? []);
      setMemberCount(data.member_count ?? 0);
      setRecentMessages(data.recent_messages ?? []);
      setStatus("ok");
    })();
  }, [token]);

  // Join once a session exists — either a guest's fresh anonymous sign-in
  // (submitGuest below) or someone who logged into an existing account.
  useEffect(() => {
    if (acceptedRef.current) return;
    if (status !== "ok" || authLoading || !user || !circleId) return;
    acceptedRef.current = true;
    (async () => {
      const { error } = await supabase
        .from("circle_members")
        .insert({ circle_id: circleId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) {
        toast.error(error.message);
        acceptedRef.current = false;
        setSubmitting(false);
        return;
      }
      try { sessionStorage.setItem(`minby_joined_${circleId}`, "1"); } catch { /* ignore */ }

      const reply = pendingReplyRef.current;
      if (reply) {
        const { error: msgErr } = await supabase
          .from("messages")
          .insert({ circle_id: circleId, user_id: user.id, body: reply, kind: "text" });
        if (msgErr) toast.error(msgErr.message);
        const lastSender = recentMessages[recentMessages.length - 1]?.sender_name ?? "";
        try {
          sessionStorage.setItem(`minby_show_add_home_${circleId}`, lastSender);
          // Avoid also nagging with the generic install banner right after this.
          localStorage.setItem("pwa-install-dismissed", "true");
        } catch { /* ignore */ }
        navigate(`/chat/${circleId}`, { replace: true });
      } else {
        setStatus("accepted");
        setTimeout(() => navigate(`/circle/${circleId}`, { replace: true }), 900);
      }
    })();
  }, [status, authLoading, user, circleId, navigate, recentMessages]);

  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestReply.trim() || submitting) return;
    setSubmitting(true);
    pendingReplyRef.current = guestReply.trim();
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: guestName.trim() } },
    });
    if (error) {
      toast.error(error.message);
      pendingReplyRef.current = null;
      setSubmitting(false);
    }
    // The join effect above takes over once `user` updates.
  };

  if (status === "loading" || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "invalid" || status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-400 text-center">
        <div className="max-w-sm">
          <Typography variant="heading" as="h1" className="mb-2" style={{ color: "hsl(var(--color-text-primary))" }}>
            {status === "expired" ? "Den här inbjudan har gått ut" : "Vi hittar inte den här inbjudan"}
          </Typography>
          <Typography variant="body" as="p" className="text-muted-foreground">
            Be den som bjöd in dig att skicka en ny länk.
          </Typography>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-400 text-center">
        <div>
          <Heart className="w-8 h-8 mx-auto mb-3" style={{ color: "hsl(var(--color-accent-terra))" }} />
          <Typography variant="heading" as="p" style={{ color: "hsl(var(--color-text-primary))" }}>
            Välkommen till {circleName}
          </Typography>
        </div>
      </div>
    );
  }

  // status === "ok" and not yet signed in
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-400 py-10">
      <div className="w-full max-w-sm text-center">
        <Typography variant="eyebrow" as="span" style={{ color: "#9B8BA5" }}>
          {inviterName} har bjudit in dig till
        </Typography>

        <Typography variant="display" as="h1" className="mt-3" style={{ color: "#1C1917" }}>
          {circleName}
        </Typography>

        {/* Members — initials only */}
        {members.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex -space-x-200">
              {members.slice(0, 6).map((m, i) => (
                <Typography
                  key={i}
                  variant="meta"
                  as="div"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white ring-2 ring-background"
                  style={{ backgroundColor: "#8b6f5e" }}
                >
                  {initials(m.display_name)}
                </Typography>
              ))}
              {memberCount > 6 && (
                <Typography
                  variant="meta"
                  as="div"
                  className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-background"
                  style={{ backgroundColor: "#F5EFD9", color: "#2B2B2B" }}
                >
                  +{memberCount - 6}
                </Typography>
              )}
            </div>
          </div>
        )}

        {/* Recent messages */}
        {recentMessages.length > 0 && (
          <div className="mt-6 rounded-200 p-300 text-left space-y-1" style={{ backgroundColor: "hsl(var(--butter-100))" }}>
            {recentMessages.map((m) => (
              <Typography key={m.id} variant="body" as="p" className="line-clamp-1" style={{ color: "hsl(var(--color-text-primary))" }}>
                <span style={{ fontWeight: 500 }}>{m.sender_name}:</span> {messageText(m)}
              </Typography>
            ))}
          </div>
        )}

        {/* Guest join form */}
        <form onSubmit={submitGuest} className="mt-8 space-y-3 text-left">
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Ditt namn"
            className="rounded-lg bg-card border-0"
            required
            autoComplete="name"
          />
          <Textarea
            value={guestReply}
            onChange={(e) => setGuestReply(e.target.value)}
            placeholder="Ditt svar"
            rows={2}
            className="rounded-lg resize-none"
            required
          />
          <button
            type="submit"
            disabled={submitting || !guestName.trim() || !guestReply.trim()}
            className="w-full rounded-lg py-3.5 disabled:opacity-50"
            style={{ backgroundColor: "#561828", color: "#F0EAE2" }}
          >
            <Typography variant="action" as="span">
              {submitting ? "…" : "Skicka och gå med"}
            </Typography>
          </button>
          <Typography variant="meta" as="p" className="text-center text-muted-foreground pt-1">
            Ingen app behövs. Du kan lägga till Minby senare.
          </Typography>
        </form>

        <Typography variant="meta" as="p" className="mt-6 text-muted-foreground">
          Har du redan ett konto?{" "}
          <button
            onClick={() => {
              try { sessionStorage.setItem("pending_invite_token", token!); } catch { /* ignore */ }
              navigate("/auth");
            }}
            className="underline"
            style={{ color: "#1C1917" }}
          >
            Logga in
          </button>
        </Typography>
      </div>
    </div>
  );
};

export default InvitePage;
