import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X } from "lucide-react";

const WelcomeScreen = ({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) => {

  return (
    <div
      style={{
        backgroundColor: "#F0EAE2",
        padding: "0 24px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {/* Upper zone – centered vertically */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Logo */}
        <span
          style={{
            fontFamily: "'Lexend', sans-serif",
            fontSize: 13,
            fontWeight: 400,
            color: "#C4522A",
            letterSpacing: "0.2em",
            textTransform: "lowercase",
            marginBottom: 48,
          }}
        >
          minby
        </span>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 32,
            fontWeight: 400,
            color: "#2E1F3E",
            lineHeight: 1.25,
            marginBottom: 24,
          }}
        >
          Äntligen ett ställe{" "}
          <em style={{ fontStyle: "italic", color: "#C4522A" }}>bara för er.</em>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 300,
            color: "#2E1F3E",
            lineHeight: 1.6,
          }}
        >
          Minby är din slutna krets. Dela vardagen och ses på riktigt med de som betyder mest.
        </p>
      </div>

      {/* Lower zone – always at bottom */}
      <div style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)", paddingTop: 16 }}>

        {/* Primary button */}
        <button
          onClick={onGetStarted}
          style={{
            background: "#2E1F3E",
            color: "#F0EAE2",
            border: "none",
            borderRadius: 8,
            padding: 16,
            fontSize: 15,
            fontWeight: 500,
            width: "100%",
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          Kom igång
        </button>

        {/* Login link */}
        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: 300,
            color: "#9B8BA5",
            margin: "0 0 16px",
          }}
        >
          Har du redan ett konto?{" "}
          <span
            onClick={onLogin}
            style={{ color: "#2E1F3E", fontWeight: 500, cursor: "pointer" }}
          >
            Logga in
          </span>
        </p>
      </div>
    </div>
  );
};

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
            <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: "0.2em", color: "#C4522A", textTransform: "uppercase" as const }}>minby</span>
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
                className="mt-1.5 rounded-lg bg-card border-0"
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
          <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: "0.2em", color: "#C4522A", textTransform: "lowercase" as const }}>minby</span>
          <h1 className="font-display font-medium text-[20px] text-foreground mt-4">
            {isSignUp ? t("joinMinby") : t("welcomeBack")}
          </h1>
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
                className="mt-1.5 rounded-lg bg-card border-0"
                style={{ color: "hsl(var(--color-text-primary))" }}
                required
              />
              <style>{`#name::placeholder { color: #B0A8B5 !important; opacity: 1; }`}</style>
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-xs text-muted-foreground">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.se"
              className="mt-1.5 rounded-lg bg-card border-0"
              style={{ color: "hsl(var(--color-text-primary))" }}
              required
            />
            <style>{`#email::placeholder { color: #B0A8B5 !important; opacity: 1; }`}</style>
          </div>
          <div>
            <Label htmlFor="password" className="text-xs text-muted-foreground">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 rounded-lg bg-card border-0"
              style={{ color: "#B0A8B5" }}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              required
            />
            <style>{`#password::placeholder { color: #B0A8B5 !important; opacity: 1; }`}</style>
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
            className="w-full font-medium text-sm"
            disabled={loading || (isSignUp && !consent)}
            style={{
              borderRadius: 8,
              ...(isSignUp && consent ? { backgroundColor: "hsl(var(--color-text-primary))", color: "#fff" } : 
                !isSignUp ? { backgroundColor: "hsl(var(--color-text-primary))", color: "#fff" } : {}),
            }}
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
