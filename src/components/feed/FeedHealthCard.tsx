import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import FeedAvatar from "@/components/feed/FeedAvatar";

interface FeedHealthCardProps {
  post: {
    id: string;
    content: string | null;
    created_at: string;
    sectionName: string;
  };
  profile: {
    display_name: string | null;
    avatar_url?: string | null;
    initials: string;
  };
  isOwn?: boolean;
  onProfileClick: () => void;
  onSendHug?: () => void;
}

const FeedHealthCard = ({ post, profile, isOwn, onProfileClick }: FeedHealthCardProps) => {
  const { user } = useAuth();
  const [hugSent, setHugSent] = useState(false);
  const [sending, setSending] = useState(false);
  const timeAgo = getTimeAgo(post.created_at);

  const handleSendHug = async () => {
    if (!user || sending) return;
    setSending(true);
    try {
      const { data: existing } = await supabase
        .from("post_reactions")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .eq("emoji", "🤗")
        .maybeSingle();

      if (existing) {
        await supabase.from("post_reactions").delete().eq("id", existing.id);
        setHugSent(false);
        toast.success("Kram borttagen");
      } else {
        await supabase.from("post_reactions").insert({
          post_id: post.id,
          user_id: user.id,
          emoji: "🤗",
        });
        setHugSent(true);
        toast.success("Kärlek skickad");
      }
    } catch {
      toast.error("Kunde inte skicka kram");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-[14px] overflow-hidden">
      <div className="m-3 rounded-[10px] bg-dusty-rose-bg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <FeedAvatar
              avatarUrl={(profile as any).avatar_url || null}
              displayName={profile.display_name}
              initials={profile.initials}
              onClick={onProfileClick}
            />
            <div>
              <button onClick={onProfileClick} className="text-sm font-medium text-foreground hover:underline block leading-tight">
                {isOwn ? "Du" : (profile.display_name || "Någon")}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {post.content || "Behöver lite ro"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwn && (
              <span
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]"
                style={{ backgroundColor: '#F7F3EF', color: '#7A6A85' }}
              >
                Ditt inlägg
              </span>
            )}
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px] bg-dusty-rose text-foreground">
              PMS
            </span>
          </div>
        </div>
      </div>

      {!isOwn && (
        <div className="px-4 pb-4">
          <motion.button
            onClick={handleSendHug}
            disabled={sending}
            whileTap={{ scale: 0.92 }}
            animate={hugSent ? { scale: [1, 1.12, 1] } : {}}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-50"
            style={{
              backgroundColor: hugSent ? "#EDE8F4" : "transparent",
              borderColor: "transparent",
              color: hugSent ? "#3C2A4D" : "#7A6A85",
            }}
          >
            <Heart
              size={16}
              strokeWidth={1.8}
              style={{
                stroke: hugSent ? "#3C2A4D" : "#C9B8D8",
                fill: hugSent ? "#EDE8F4" : "none",
              }}
            />
            {hugSent ? "Kärlek skickad" : "Skicka kärlek"}
          </motion.button>
        </div>
      )}
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "nu";
  if (diffMins < 60) return `${diffMins} min sedan`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} tim sedan`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d sedan`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default FeedHealthCard;
