import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, PlusCircle, Bell, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ShareNewSheet from "@/components/ShareNewSheet";

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Friends", icon: Users, path: "/friends" },
  { label: "Share", icon: PlusCircle, path: "__share__" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel("notif-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <>
      <ShareNewSheet open={shareOpen} onOpenChange={setShareOpen} />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border/50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.path !== "__share__" && location.pathname === item.path;
            const isShare = item.path === "__share__";

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (isShare) {
                    setShareOpen(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors relative ${
                  isShare
                    ? "text-primary"
                    : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isShare ? (
                  <PlusCircle className="w-7 h-7" strokeWidth={1.5} />
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
