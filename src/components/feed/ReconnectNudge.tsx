import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";

interface ReconnectNudgeProps {
  friendIds: string[];
  profiles: { [userId: string]: { display_name: string | null; avatar_url: string | null } };
}

const ReconnectNudge = ({ friendIds, profiles }: ReconnectNudgeProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nudgeFriend, setNudgeFriend] = useState<{ userId: string; name: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || friendIds.length === 0) return;

    // Check if we already showed a nudge recently (once per 7 days)
    const lastShown = sessionStorage.getItem("reconnect_nudge_shown");
    if (lastShown && Date.now() - parseInt(lastShown) < 7 * 24 * 3600_000) return;

    const checkReconnect = async () => {
      // Find friends with no recent posts (>60 days since their last post visible to us)
      const cutoffDate = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();

      const { data: recentPosts } = await supabase
        .from("life_posts")
        .select("user_id, created_at")
        .in("user_id", friendIds)
        .gte("created_at", cutoffDate);

      const recentUserIds = new Set((recentPosts || []).map((p) => p.user_id));
      const quietFriends = friendIds.filter((id) => !recentUserIds.has(id));

      if (quietFriends.length === 0) return;

      // Pick one random quiet friend
      const picked = quietFriends[Math.floor(Math.random() * quietFriends.length)];
      const profile = profiles[picked];
      if (!profile?.display_name) return;

      setNudgeFriend({ userId: picked, name: profile.display_name });
      sessionStorage.setItem("reconnect_nudge_shown", String(Date.now()));
    };

    checkReconnect();
  }, [user, friendIds, profiles]);

  if (!nudgeFriend || dismissed) return null;

  return (
    <div
      className="mb-4 relative"
      style={{
        backgroundColor: "hsl(var(--color-surface-raised))",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3"
      >
        <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--color-text-muted))" }} />
      </button>
      <p className="text-[13px] font-medium pr-6" style={{ color: "hsl(var(--color-text-primary))" }}>
        Det var ett tag sedan du och {nudgeFriend.name} hördes
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => navigate(`/profile/${nudgeFriend.userId}`)}
          className="px-4 py-1.5 rounded-full text-[12px] font-medium"
          style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#F7F3EF" }}
        >
          Säg hej
        </button>
        <button
          onClick={() => {
            navigate(`/profile/${nudgeFriend.userId}`);
          }}
          className="px-4 py-1.5 rounded-full text-[12px] font-medium"
          style={{ backgroundColor: "hsl(var(--color-surface-card))", color: "hsl(var(--color-text-primary))", border: "1px solid #EDE8F4" }}
        >
          Ska ni ses?
        </button>
      </div>
    </div>
  );
};

export default ReconnectNudge;
