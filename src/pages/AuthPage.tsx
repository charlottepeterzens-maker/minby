import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const t = (key: string): string => {
  const map: Record<string, string> = {
    checkEmail: "Kolla din e-post för att bekräfta kontot!",
    email: "E-post",
    password: "Lösenord",
    yourName: "Ditt namn",
    howFriendsKnowYou: "Så dina vänner känner igen dig",
    joinMinby: "Gå med i minby",
    welcomeBack: "Välkommen tillbaka",
    createAccount: "Skapa konto",
    signIn: "Logga in",
    signUp: "Registrera dig",
    alreadyHaveAccount: "Har du redan ett konto?",
    dontHaveAccount: "Har du inget konto?",
  };
  return map[key] ?? key;
};
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import TextButton from "@/components/ui/text-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { motion } from "framer-motion";

const WelcomeScreen = ({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) => {

  return (
    <div
      style={{
        backgroundColor: "hsl(42, 20%, 95%)",
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
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 400,
            color: "#C85A2E",
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
            fontFamily: "'Outfit', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: "#1C1917",
            lineHeight: 1.25,
            marginBottom: 24,
          }}
        >
          Äntligen ett ställe{" "}
          <em style={{ fontStyle: "italic", color: "#C85A2E" }}>bara för er.</em>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 300,
            color: "#1C1917",
            lineHeight: 1.6,
          }}
        >
          Minby är din slutna krets. Dela vardagen och ses på riktigt med de som betyder mest.
        </p>
      </div>

      {/* Lower zone – always at bottom */}
      <div style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)", paddingTop: 16 }}>

        {/* Primary button */}
        <motion.button
          onClick={onGetStarted}
          whileTap={{ scale: 0.96 }}
          style={{
            background: "#561828",
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
        </motion.button>

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
            style={{ color: "#1C1917", fontWeight: 500, cursor: "pointer" }}
          >
            Logga in
          </span>
        </p>
      </div>
    </div>
  );
};

const AuthPage = () => {
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
            <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: "0.2em", color: "#C85A2E", textTransform: "uppercase" as const }}>minby</span>
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
            <div className="pt-2 flex justify-center">
              <TextButton type="submit" disabled={loading}>
                {loading ? "..." : "Skicka återställningslänk"}
              </TextButton>
            </div>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-8">
            <TextButton onClick={() => setView("login")}>
              Tillbaka till inloggning
            </TextButton>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: "0.2em", color: "#C85A2E", textTransform: "lowercase" as const }}>minby</span>
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
              style={{ color: "hsl(var(--color-text-faint))" }}
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

          <div className="pt-2 flex justify-center">
            <TextButton type="submit" disabled={loading || (isSignUp && !consent)}>
              {loading ? "..." : isSignUp ? t("createAccount") : t("signIn")}
            </TextButton>
          </div>
        </form>

        {!isSignUp && (
          <div className="text-center mt-3">
            <TextButton type="button" variant="secondary" onClick={() => setView("forgot")}>
              Glömt lösenord?
            </TextButton>
          </div>
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">eller</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex justify-center">
          <TextButton
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) {
                  toast.error("Kunde inte logga in med Google");
                }
                if (result.redirected) return;
              } catch {
                toast.error("Något gick fel");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Fortsätt med Google
          </TextButton>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
          <TextButton onClick={() => setView(isSignUp ? "login" : "signup")}>
            {isSignUp ? t("signIn") : t("signUp")}
          </TextButton>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
