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
import { Typography } from "@/components/ui/typography";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";

const WelcomeScreen = ({
  onGetStarted,
  onLogin,
}: {
  onGetStarted: () => void;
  onLogin: () => void;
}) => {
  return (
    <div
      style={{
        backgroundColor: "#F9F3E1",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 360,
        }}
      >
        {/* Logo */}
        <Typography
          variant="wordmark"
          as="span"
          style={{
            color: "hsl(var(--color-accent-terra))",
            marginBottom: 56,
          }}
          className="lowercase block"
        >
          minby
        </Typography>

        {/* Heading */}
        <Typography
          variant="display"
          style={{
            color: "hsl(var(--color-text-primary))",
            margin: 0,
            marginBottom: 24,
          }}
        >
          Äntligen ett ställe
          <br />
          bara för <span style={{ color: "#561828" }}>er.</span>
        </Typography>

        {/* Body */}
        <Typography
          variant="body"
          style={{
            color: "hsl(var(--color-text-tertiary))",
            margin: 0,
            maxWidth: 320,
          }}
        >
          Minby är din slutna krets. Dela vardagen och ses på riktigt med de
          som betyder mest.
        </Typography>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        <motion.button
          onClick={onGetStarted}
          whileTap={{ scale: 0.97 }}
          className={typography.body}
          style={{
            width: "100%",
            height: 56,
            border: "none",
            borderRadius: 28,
            background: "#561828",
            color: "#F9F3E1",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          Kom igång
        </motion.button>

        <Typography
          variant="meta"
          as="p"
          style={{
            margin: 0,
            textAlign: "center",
            color: "hsl(var(--color-text-tertiary))",
          }}
        >
          Har du redan ett konto?{" "}
          <span
            onClick={onLogin}
            className={typography.action}
            style={{
              color: "#561828",
              cursor: "pointer",
            }}
          >
            Logga in
          </span>
        </Typography>
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
            <Typography variant="wordmark" as="span" style={{ color: "hsl(var(--color-accent-terra))" }} className="uppercase">minby</Typography>
            <Typography variant="heading" as="h1" className="text-foreground mt-4">Glömt lösenord?</Typography>
            <Typography variant="body" as="p" className="text-muted-foreground mt-2">Ange din e-post så skickar vi en återställningslänk</Typography>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-300">
            <div>
              <Label htmlFor="forgot-email" className={cn(typography.meta, "text-muted-foreground")}>{t("email")}</Label>
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
            <div className="pt-200 flex justify-center">
              <TextButton type="submit" disabled={loading}>
                {loading ? "..." : "Skicka återställningslänk"}
              </TextButton>
            </div>
          </form>
          <Typography variant="body" as="p" className="text-center text-muted-foreground mt-8">
            <TextButton onClick={() => setView("login")}>
              Tillbaka till inloggning
            </TextButton>
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Typography variant="wordmark" as="span" style={{ color: "hsl(var(--color-accent-terra))" }} className="lowercase">minby</Typography>
          <Typography variant="heading" as="h1" className="text-foreground mt-4">
            {isSignUp ? t("joinMinby") : t("welcomeBack")}
          </Typography>
        </div>

        <form onSubmit={handleSubmit} className="space-y-300">
          {isSignUp && (
            <div>
              <Label htmlFor="name" className={cn(typography.meta, "text-muted-foreground")}>{t("yourName")}</Label>
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
            <Label htmlFor="email" className={cn(typography.meta, "text-muted-foreground")}>{t("email")}</Label>
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
            <Label htmlFor="password" className={cn(typography.meta, "text-muted-foreground")}>{t("password")}</Label>
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
            <label className="flex items-start gap-200.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
              />
              <Typography variant="meta" as="span" className="text-muted-foreground">
                Jag har läst och godkänner{" "}
                <Link to="/privacy" className="underline text-foreground hover:opacity-80">integritetspolicyn</Link>
                {" "}och{" "}
                <Link to="/terms" className="underline text-foreground hover:opacity-80">användarvillkoren</Link>
              </Typography>
            </label>
          )}

          <div className="pt-200 flex justify-center">
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
          <Typography variant="meta" as="span" className="text-muted-foreground">eller</Typography>
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

        <Typography variant="body" as="p" className="text-center text-muted-foreground mt-8">
          {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
          <TextButton onClick={() => setView(isSignUp ? "login" : "signup")}>
            {isSignUp ? t("signIn") : t("signUp")}
          </TextButton>
        </Typography>
      </div>
    </div>
  );
};

export default AuthPage;
