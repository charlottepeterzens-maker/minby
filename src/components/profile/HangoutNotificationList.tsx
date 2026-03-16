import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HangoutNotification {
  id: string;
  type: string;
  title: string;
  from_user_id: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
  fromProfile?: { display_name: string | null; avatar_url: string | null };
}

interface Props {
  onOpenHangout: (hangoutId: string) => void;
  onNotificationsRead?: () => void;
}

const HangoutNotificationList = ({ onOpenHangout, onNotificationsRead }: Props) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<HangoutNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .in("type", ["hangout_yes", "hangout_maybe"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const fromIds = [...new Set(data.filter(n => n.from_user_id).map(n => n.from_user_id!))];
      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (fromIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", fromIds);
        if (profiles) {
          profileMap = new Map(profiles.map(p => [p.user_id, p]));
        }
      }
      setNotifications(data.map(n => ({
        ...n,
        fromProfile: n.from_user_id ? profileMap.get(n.from_user_id) || null : null,
      })) as HangoutNotification[]);
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleClick = async (n: HangoutNotification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onNotificationsRead?.();
    }
    if (n.reference_id) {
      onOpenHangout(n.reference_id);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m sedan`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h sedan`;
    const days = Math.floor(hours / 24);
    return `${days}d sedan`;
  };

  if (notifications.length === 0) return null;

  const unread = notifications.filter(n => !n.read);
  const display = unread.length > 0 ? unread : notifications.slice(0, 3);

  return (
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-wider font-medium mb-2" style={{ color: "#B0A8B5" }}>
        Nytt
      </p>
      <div className="space-y-1.5">
        {display.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className="flex items-center gap-2.5 w-full text-left p-2.5 rounded-[12px] transition-colors"
            style={{
              backgroundColor: n.read ? "transparent" : "#F5F0FA",
              border: n.read ? "0.5px solid #EDE8F4" : "0.5px solid #C9B8D8",
            }}
          >
            <Avatar className="w-7 h-7 shrink-0">
              {n.fromProfile?.avatar_url && <AvatarImage src={n.fromProfile.avatar_url} />}
              <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[10px] font-medium">
                {n.fromProfile?.display_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-foreground leading-snug truncate">{n.title}</p>
              <p className="text-[10px]" style={{ color: "#B0A8B5" }}>{timeAgo(n.created_at)}</p>
            </div>
            {!n.read && (
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#E53E3E" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HangoutNotificationList;
