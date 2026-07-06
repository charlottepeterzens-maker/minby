import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import FirstTimeOverlay from "@/components/onboarding/FirstTimeOverlay";
import PushPermissionDialog from "@/components/PushPermissionDialog";
import FeedPage from "./pages/FeedPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import FriendsPage from "./pages/FriendsPage";
import NotificationsPage from "./pages/NotificationsPage";
import Index from "./pages/Index";
import GroupsPage from "./pages/GroupsPage";
import GroupChatPage from "./pages/GroupChatPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import InvitePage from "./pages/InvitePage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setOnboarded(null);
      return () => {
        isMounted = false;
      };
    }

    supabase
      .from("profiles")
      .select("onboarded_at, display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!isMounted) return;

        if (error) {
          console.error("Failed to load onboarding state", error);
          setOnboarded(false);
          return;
        }

        if (!data) {
          const fallbackName =
            (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
            user.email?.split("@")[0] ||
            null;

          const { error: upsertError } = await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              display_name: fallbackName,
            },
            { onConflict: "user_id" }
          );

          if (upsertError) {
            console.error("Failed to create missing profile", upsertError);
          }

          if (isMounted) {
            setOnboarded(false);
          }

          return;
        }

        setOnboarded(!!data.onboarded_at);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-[26px] font-display font-light tracking-[-0.5px] text-foreground lowercase">minby</span>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (onboarded === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-[26px] font-display font-light tracking-[-0.5px] text-foreground lowercase">minby</span>
      </div>
    );
  }

  return (
    <>
      {children}

      {!onboarded && (
        <FirstTimeOverlay
          onComplete={() => {
            setOnboarded(true);
            if (user) {
              supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("user_id", user.id)
                .then(({ error }) => { if (error) console.error("Failed to set onboarded_at:", error); });
            }
          }}
          onDismiss={() => {
            setOnboarded(true);
            if (user) {
              supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("user_id", user.id)
                .then(({ error }) => { if (error) console.error("Failed to set onboarded_at:", error); });
            }
          }}
        />
      )}
    </>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          <Route path="/" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/circles" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <AnimatedRoutes />
            <PWAInstallBanner />
            <PushPermissionDialog />
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
