import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Lösenordet måste vara minst 6 tecken");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Lösenorden matchar inte");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Lösenordet har uppdaterats!");
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        <div className="w-full max-w-sm text-center">
          <span className="text-[26px] font-display font-light tracking-[-0.5px] text-foreground lowercase">minby</span>
          <p className="text-muted-foreground mt-4 text-sm">Ogiltig eller utgången återställningslänk.</p>
          <Button
            onClick={() => navigate("/auth")}
            className="mt-6 w-full rounded-lg font-medium text-sm"
            style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#fff" }}
          >
            Tillbaka till inloggning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="text-[26px] font-display font-light tracking-[-0.5px] text-foreground lowercase">minby</span>
          <h1 className="font-display font-medium text-[20px] text-foreground mt-4">Välj nytt lösenord</h1>
          <p className="text-muted-foreground mt-2 text-sm">Ange ditt nya lösenord nedan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new-password" className="text-xs text-muted-foreground">Nytt lösenord</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 rounded-lg bg-card border-0"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Bekräfta lösenord</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 rounded-lg bg-card border-0"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-lg font-medium text-sm"
            disabled={loading}
            style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#fff" }}
          >
            {loading ? "..." : "Uppdatera lösenord"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
