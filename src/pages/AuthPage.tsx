import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AuthPage = () => {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <span className="text-2xl mb-2 block font-display font-normal tracking-[0.35em] text-primary">MINBY</span>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {isSignUp ? t("joinMinby") : t("welcomeBack")}
          </h1>
          <p className="text-muted-foreground mt-2 font-body">
            {isSignUp ? t("startPlanning") : t("yourFriendsWaiting")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="name" className="text-sm text-muted-foreground">{t("yourName")}</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("howFriendsKnowYou")}
                className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-sm text-muted-foreground">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm text-muted-foreground">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full rounded-xl font-semibold" disabled={loading}>
            {loading ? "..." : isSignUp ? t("createAccount") : t("signIn")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? t("signIn") : t("signUp")}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
