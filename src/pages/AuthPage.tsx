import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const WelcomeScreen = ({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) => (
  <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
    <div className="w-full max-w-sm text-center">
      <span
        className="block font-display lowercase mb-8"
        style={{ fontWeight: 300, fontSize: "26px", letterSpacing: "-0.5px", color: "hsl(var(--color-text-primary))" }}
      >
        minby
      </span>

      <div className="space-y-3 mb-10">
        <p style={{ fontSize: "13px", color: "hsl(var(--color-text-secondary))", lineHeight: 1.6 }}>
          Du scrollar i timmar och vet ändå inte hur din bästa vän egentligen mår.
        </p>
        <p style={{ fontSize: "13px", color: "hsl(var(--color-text-primary))", fontWeight: 500, lineHeight: 1.6 }}>
          Minby är din slutna krets – de närmaste, de som faktiskt vill veta.
        </p>
        <p style={{ fontSize: "13px", color: "hsl(var(--color-text-secondary))", lineHeight: 1.6 }}>
          Dela din dag, planera något, ses på riktigt.
        </p>
      </div>

      <Button
        onClick={onGetStarted}
        className="w-full text-[13px] font-normal"
        style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#fff", borderRadius: "20px", height: "48px" }}
      >
        Kom igång
      </Button>

      <button
        onClick={onLogin}
        className="mt-4 text-[13px] hover:underline"
        style={{ color: "hsl(var(--color-text-secondary))" }}
      >
        Har du redan ett konto? <span style={{ color: "hsl(var(--color-text-primary))", fontWeight: 500 }}>Logga in</span>
      </button>
    </div>
  </div>
);

const AuthPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"welcome" | "signup" | "login" | "forgot">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const isSignUp = view === "signup";

  useEffect(() => {
    if (user) {
      const pendingToken = sessionStorage.getItem("pending_invite_token");
      if (pendingToken) {
        sessionStorage.removeItem("pending_invite_token");
        navigate(`/invite/${pendingToken}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success(t("checkEmail"));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          toast.error(error.message);
        } else {
          const pendingToken = sessionStorage.getItem("pending_invite_token");
          if (pendingToken) {
            sessionStorage.removeItem("pending_invite_token");
            navigate(`/invite/${pendingToken}`, { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Kolla din e-post för en återställningslänk!");
      }
    } finally {
      setLoading(false);
    }
  };

  if (view === "welcome") {
    return (
      <WelcomeScreen
        onGetStarted={() => setView("signup")}
        onLogin={() => setView("login")}
      />
    );
  }

  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <span className="text-[26px] font-display font-light tracking-[-0.5px] text-foreground lowercase">minby</span>
            <h1 className="font-display font-medium text-[20px] text-foreground mt-4">Glömt lösenord?</h1>
            <p className="text-muted-foreground mt-2 text-sm">Ange din e-post så skickar vi en återställningslänk</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="forgot-email" className="text-xs text-muted-foreground">{t("email")}</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1.5 rounded-lg bg-card border border-border"
                autoComplete="email"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-lg font-medium text-sm"
              disabled={loading}
              style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#fff" }}
            >
              {loading ? "..." : "Skicka återställningslänk"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-8">
            <button onClick={() => setView("login")} className="text-foreground font-medium hover:underline">
              Tillbaka till inloggning
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="text-[26px] font-display font-light tracking-[-0.5px] text-foreground lowercase">minby</span>
          <h1 className="font-display font-medium text-[20px] text-foreground mt-4">
            {isSignUp ? t("joinMinby") : t("welcomeBack")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSignUp ? t("startPlanning") : t("yourFriendsWaiting")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">{t("yourName")}</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("howFriendsKnowYou")}
                className="mt-1.5 rounded-lg bg-card border border-border"
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-xs text-muted-foreground">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-1.5 rounded-lg bg-card border border-border"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs text-muted-foreground">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 rounded-lg bg-card border border-border"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </div>

          {isSignUp && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
              />
              <span className="text-[12px] text-muted-foreground leading-[1.5]">
                Jag har läst och godkänner{" "}
                <Link to="/privacy" className="underline text-foreground hover:opacity-80">integritetspolicyn</Link>
                {" "}och{" "}
                <Link to="/terms" className="underline text-foreground hover:opacity-80">användarvillkoren</Link>
              </span>
            </label>
          )}

          <Button
            type="submit"
            className="w-full rounded-lg font-medium text-sm"
            disabled={loading || (isSignUp && !consent)}
            style={isSignUp && consent ? { backgroundColor: "hsl(var(--color-text-primary))", color: "#fff" } : undefined}
          >
            {loading ? "..." : isSignUp ? t("createAccount") : t("signIn")}
          </Button>
        </form>

        {!isSignUp && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="text-xs text-muted-foreground hover:underline"
            >
              Glömt lösenord?
            </button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
          <button
            onClick={() => setView(isSignUp ? "login" : "signup")}
            className="text-foreground font-medium hover:underline"
          >
            {isSignUp ? t("signIn") : t("signUp")}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
