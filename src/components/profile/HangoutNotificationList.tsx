import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/utils/avatarUrl";

interface HangoutNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  from_user_id: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
  fromProfile?: { display_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  onOpenHangout: (hangoutId: string) => void;
  onNotificationsRead?: () => void;
}

const HangoutNotificationList = ({ onOpenHangout, onNotificationsRead }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<HangoutNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

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

  // Realtime: refetch on new inserts
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("profile-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const handleClick = async (n: HangoutNotification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onNotificationsRead?.();
    }

    if ((n.type === "hangout_yes" || n.type === "hangout_maybe" || n.type === "hangout_comment") && n.reference_id) {
      onOpenHangout(n.reference_id);
    } else if (n.type === "hangout_new" && n.reference_id) {
      navigate(`/profile/${n.reference_id}`);
    } else if (n.type === "friend_request" || n.type === "friend_accepted") {
      navigate("/friends");
    } else if (n.type === "life_comment" && n.reference_id) {
      // Stay on profile – could deep-link later
    } else if (n.type === "group_invite" || n.type === "group_message") {
      if (n.reference_id) navigate(`/groups/${n.reference_id}`);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onNotificationsRead?.();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just nu";
    if (mins < 60) return `${mins} min sedan`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} tim sedan`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "igår";
    if (days < 7) return `${days} d sedan`;
    return new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  };

  const unread = notifications.filter(n => !n.read);
  if (unread.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "#B0A8B5" }}>
          Nytt
        </p>
        {unread.length > 1 && (
          <button
            onClick={markAllRead}
            className="text-[11px] hover:underline transition-colors"
            style={{ color: "#7A6A85" }}
          >
            Markera alla som lästa
          </button>
        )}
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #EDE8F4",
        }}
      >
        <div className="max-h-[200px] overflow-y-auto">
          {unread.map((n, i) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 transition-colors hover:bg-[#FAFAFA]"
              style={{
                borderBottom: i < unread.length - 1 ? "1px solid #EDE8F4" : "none",
              }}
            >
              {/* Unread dot */}
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: "#C9B8D8" }}
              />

              {/* Avatar */}
              <Avatar className="w-9 h-9 shrink-0">
                {resolveAvatarUrl(n.fromProfile?.avatar_url ?? null) && <AvatarImage src={resolveAvatarUrl(n.fromProfile?.avatar_url ?? null)!} className="object-cover" />}
                <AvatarFallback
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                  className="text-[11px] font-medium"
                >
                  {n.fromProfile?.display_name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] leading-snug"
                  style={{ color: "#3C2A4D" }}
                >
                  {n.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#B0A8B5" }}>
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HangoutNotificationList;
