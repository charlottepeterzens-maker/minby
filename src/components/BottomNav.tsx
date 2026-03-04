import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, PlusCircle, Bell, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import ShareNewSheet from "@/components/ShareNewSheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const navItems: { labelKey: TranslationKey; icon: typeof Home; path: string }[] = [
  { labelKey: "home", icon: Home, path: "/" },
  { labelKey: "friends", icon: Users, path: "/friends" },
  { labelKey: "share", icon: PlusCircle, path: "__share__" },
  { labelKey: "notifications", icon: Bell, path: "/notifications" },
  { labelKey: "profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single().then(({ data }) => {
      setAvatarUrl(data?.avatar_url || null);
    });
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
                key={item.labelKey}
                onClick={() => {
                  if (isShare) {
                    setShareOpen(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors relative ${
                  isShare
                    ? "text-primary"
                    : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isShare ? (
                  <PlusCircle className="w-7 h-7" strokeWidth={1.5} />
                ) : item.labelKey === "profile" && avatarUrl ? (
                  <Avatar className="w-6 h-6 border border-primary/30">
                    <AvatarImage src={avatarUrl} alt="Profile" />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary"><User className="w-3 h-3" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
                
                {item.labelKey === "notifications" && unreadCount > 0 && (
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
