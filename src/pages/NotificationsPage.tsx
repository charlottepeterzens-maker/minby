import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-display text-lg font-medium tracking-[0.35em] text-foreground">{t("notifications").toUpperCase()}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1 text-muted-foreground">
              <Check className="w-3 h-3" strokeWidth={1.5} /> {t("markAllRead")}
            </Button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-muted rounded-[14px] h-16 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-lg text-muted-foreground">{t("noNotificationsYet")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("notificationsHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left p-4 rounded-[14px] border-[0.5px] transition-colors duration-150 cursor-pointer ${
                  n.read ? "bg-card border-border" : "bg-lavender-bg border-secondary"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {n.type === "friend_request" && !n.read && n.from_user_id && (
                    <Button
                      size="sm"
                      className="text-xs h-7 gap-1 shrink-0 rounded-[10px] bg-salvia-bg text-accent-foreground border-[0.5px] border-accent hover:bg-accent"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); acceptFriendRequest(n); }}
                    >
                      <UserCheck className="w-3 h-3" strokeWidth={1.5} /> {t("accept")}
                    </Button>
                  )}
                  {!n.read && n.type !== "friend_request" && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              </div>
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
