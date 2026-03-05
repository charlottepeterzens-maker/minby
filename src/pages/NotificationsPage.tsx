import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Check, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  from_user_id: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const acceptFriendRequest = async (n: Notification) => {
    if (!user || !n.from_user_id) return;
    const { data: req } = await supabase
      .from("friend_requests")
      .select("id")
      .eq("from_user_id", n.from_user_id)
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .single();
    if (req) {
      await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", req.id);
      await supabase.from("friend_access_tiers").upsert([
        { owner_id: user.id, friend_user_id: n.from_user_id, tier: "outer" as const },
        { owner_id: n.from_user_id, friend_user_id: user.id, tier: "outer" as const },
      ], { onConflict: "owner_id,friend_user_id" });
      markRead(n.id);
      toast({ title: t("friendAdded") });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display text-lg font-normal tracking-[0.35em] text-foreground">{t("notifications").toUpperCase()}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1">
              <Check className="w-3 h-3" /> {t("markAllRead")}
            </Button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t("loading")}</div>
        ) : notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="font-display text-lg text-muted-foreground">{t("noNotificationsYet")}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t("notificationsHint")}</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => markRead(n.id)}
                className={`w-full text-left p-4 border transition-all cursor-pointer ${
                  n.read ? "bg-card border-border/30" : "bg-primary/5 border-primary/20 shadow-soft"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {n.type === "friend_request" && !n.read && n.from_user_id && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-7 gap-1 shrink-0"
                      onClick={(e) => { e.stopPropagation(); acceptFriendRequest(n); }}
                    >
                      <UserCheck className="w-3 h-3" /> {t("accept")}
                    </Button>
                  )}
                  {!n.read && n.type !== "friend_request" && (
                    <div className="w-2 h-2 bg-primary shrink-0 mt-2" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
