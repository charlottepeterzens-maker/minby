import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "invalid" | "expired" | "accepted">("loading");
  const [circleName, setCircleName] = useState<string>("");
  const [circleId, setCircleId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-invite-preview", { body: { token } });
      if (error || !data?.ok) { setStatus(data?.status === "expired" ? "expired" : "invalid"); return; }
      setCircleName(data.circle_name);
      setCircleId(data.circle_id);
      setStatus("ok");
    })();
  }, [token]);

  const accept = async () => {
    if (!user) {
      sessionStorage.setItem("pending_invite_token", token!);
      navigate("/auth");
      return;
    }
    if (!circleId) return;
    setBusy(true);
    const { error } = await supabase.from("circle_members").insert({ circle_id: circleId, user_id: user.id });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    setStatus("accepted");
    setTimeout(() => navigate(`/circle/${circleId}`), 900);
  };

  if (status === "loading" || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (status === "invalid" || status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl mb-2">Länken fungerar inte</h1>
          <p className="text-sm text-muted-foreground">{status === "expired" ? "Inbjudan har gått ut." : "Kontrollera länken och försök igen."}</p>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <Heart className="w-8 h-8 mx-auto mb-3" style={{ color: "#C85A2E" }} />
          <p className="font-display text-lg">Välkommen till {circleName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <h1 className="font-display text-2xl">Du är inbjuden till <em style={{ color: "#C85A2E" }}>{circleName}</em></h1>
        <Button onClick={accept} disabled={busy} className="w-full rounded-lg" style={{ backgroundColor: "#561828", color: "#fff" }}>
          {busy ? "…" : user ? "Gå med" : "Logga in för att gå med"}
        </Button>
      </div>
    </div>
  );
};

export default InvitePage;
