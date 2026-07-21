import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import { Input } from "@/components/ui/input";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Member { display_name: string | null; avatar_url: string | null }

const initials = (name: string | null) => {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
};

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "invalid" | "expired" | "accepted">("loading");
  const [circleName, setCircleName] = useState("");
  const [circleId, setCircleId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const acceptedRef = useRef(false);

  // Preview
  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-invite-preview", { body: { token } });
      if (error || !data?.ok) { setStatus(data?.status === "expired" ? "expired" : "invalid"); return; }
      setCircleName(data.circle_name);
      setCircleId(data.circle_id);
      setMembers(data.members ?? []);
      setMemberCount(data.member_count ?? 0);
      setStatus("ok");
    })();
  }, [token]);

  // Auto-accept when a session appears
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
        return;
      }
      // Mark as freshly joined so the circle can show a welcome card
      try { sessionStorage.setItem(`minby_joined_${circleId}`, "1"); } catch {}
      setStatus("accepted");
      setTimeout(() => navigate(`/circle/${circleId}`, { replace: true }), 900);
    })();
  }, [status, authLoading, user, circleId, navigate]);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/invite/${token}` },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSentTo(email);
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
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-xl mb-2" style={{ color: "#2B2B2B" }}>
            {status === "expired" ? "Den här inbjudan har gått ut" : "Vi hittar inte den här inbjudan"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Be den som bjöd in dig att skicka en ny länk.
          </p>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <Heart className="w-8 h-8 mx-auto mb-3" style={{ color: "#C85A2E" }} />
          <p className="font-display text-lg" style={{ color: "#2B2B2B" }}>
            Välkommen till {circleName}
          </p>
        </div>
      </div>
    );
  }

  // status === "ok" and not yet signed in
  const nameList = members
    .map((m) => m.display_name)
    .filter(Boolean)
    .slice(0, 3) as string[];
  const rest = Math.max(0, memberCount - nameList.length);
  const memberLine = nameList.length
    ? `${nameList.join(", ")}${rest > 0 ? ` och ${rest} till` : ""} är redan här`
    : "Din krets väntar på dig";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: "#9B8BA5",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          du är inbjuden till
        </span>

        <h1
          className="mt-3"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: "#1C1917",
            lineHeight: 1.2,
          }}
        >
          {circleName}
        </h1>

        {/* Members */}
        {members.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((m, i) => (
                <div
                  key={i}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-medium ring-2 ring-background overflow-hidden"
                  style={{ backgroundColor: "#8b6f5e" }}
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(m.display_name)
                  )}
                </div>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground">{memberLine}</p>
          </div>
        )}

        {/* Minby description */}
        <p
          className="mt-8 text-[15px] leading-[1.6]"
          style={{ color: "#1C1917", fontWeight: 300 }}
        >
          Minby är ett lugnt hem för din närmsta krets. Här delar ni vardagen,
          planerar träffar och håller kontakten — utan algoritmer.
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Flytta din krets till Minby.
        </p>

        {/* Sign-up (email only) */}
        {!sentTo ? (
          <form onSubmit={sendMagicLink} className="mt-10 space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.se"
              className="rounded-lg bg-card border-0 text-center"
              required
              autoComplete="email"
            />
            <div className="flex justify-center">
              <TextButton type="submit" disabled={busy || !email}>
                {busy ? "…" : `Gå med i ${circleName}`}
              </TextButton>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Vi skickar en länk till din e-post. Inget lösenord behövs.
            </p>
          </form>
        ) : (
          <div className="mt-10 space-y-3">
            <p className="text-[15px]" style={{ color: "#2B2B2B" }}>
              Kolla din e-post
            </p>
            <p className="text-[13px] text-muted-foreground">
              Vi har skickat en länk till <strong>{sentTo}</strong>. Klicka på länken
              för att bli medlem i {circleName}.
            </p>
            <div className="pt-2">
              <TextButton type="button" variant="secondary" onClick={() => setSentTo(null)}>
                Använd en annan e-post
              </TextButton>
            </div>
          </div>
        )}

        {!sentTo && (
          <p className="mt-8 text-[13px] text-muted-foreground">
            Har du redan ett konto?{" "}
            <button
              onClick={() => {
                try { sessionStorage.setItem("pending_invite_token", token!); } catch {}
                navigate("/auth");
              }}
              className="underline"
              style={{ color: "#1C1917", fontWeight: 500 }}
            >
              Logga in
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
