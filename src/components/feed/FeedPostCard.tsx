import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import FeedAvatar from "@/components/feed/FeedAvatar";

interface FeedPostCardProps {
  post: {
    id: string;
    content: string | null;
    image_url: string | null;
    link_url: string | null;
    created_at: string;
    sectionName: string;
    sectionType: string;
    photo_layout?: string;
  };
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    initials: string;
  };
  isOwn?: boolean;
  onProfileClick: () => void;
  onSuggestPlan?: () => void;
}

const FeedPostCard = ({ post, profile, isOwn, onProfileClick, onSuggestPlan }: FeedPostCardProps) => {
  const timeAgo = getTimeAgo(post.created_at);
  const [showReactions, setShowReactions] = useState(false);
  const signedUrl = useSignedImageUrl(post.image_url);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        border: "1px solid #DDD5CC",
        padding: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <FeedAvatar
          avatarUrl={profile.avatar_url}
          displayName={profile.display_name}
          initials={profile.initials}
          onClick={onProfileClick}
        />
        <div>
          <button
            onClick={onProfileClick}
            className="text-sm font-medium text-foreground hover:underline block leading-tight"
          >
            {isOwn ? "Du" : profile.display_name || "Någon"}
          </button>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {isOwn ? "Du delade något" : `Från ${post.sectionName.toLowerCase()}`} · {timeAgo}
          </p>
        </div>
      </div>

      {/* Stor bild */}
      {signedUrl && post.photo_layout !== "small" && (
        <img
          src={signedUrl}
          alt=""
          style={{ width: "100%", marginBottom: 10, maxHeight: 280, objectFit: "cover", borderRadius: 4 }}
        />
      )}

      {/* Liten bild + text */}
      {signedUrl && post.photo_layout === "small" ? (
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <img
            src={signedUrl}
            alt=""
            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {post.content && (
              <p style={{ fontSize: 13, color: "#3C2A4D", margin: 0, lineHeight: 1.55 }}>{post.content}</p>
            )}
          </div>
        </div>
      ) : (
        post.content && (
          <p style={{ fontSize: 13, color: "#3C2A4D", margin: "0 0 10px", lineHeight: 1.55 }}>{post.content}</p>
        )
      )}

      {/* Reaktioner */}
      {isOwn ? (
        <>
          {showReactions ? (
            <PostReactions postId={post.id} readOnly />
          ) : (
            <OwnPostReactionLink postId={post.id} onShow={() => setShowReactions(true)} />
          )}
        </>
      ) : (
        <PostReactions postId={post.id} />
      )}

      {/* Föreslå något – diskret, bara för vänners inlägg */}
      {!isOwn && onSuggestPlan && (
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <button onClick={onSuggestPlan} style={{ fontSize: 11, color: "#B0A0B5" }}>
            Föreslå något →
          </button>
        </div>
      )}

      {/* Kommentarer */}
      <PostComments postId={post.id} isOwner={!!isOwn} />
    </div>
  );
};

const OwnPostReactionLink = ({ postId, onShow }: { postId: string; onShow: () => void }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("post_reactions")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [postId]);

  if (count === null || count === 0) return null;

  return (
    <button onClick={onShow} style={{ fontSize: 11, color: "#7A6A85" }} className="hover:underline mt-1.5">
      {count} {count === 1 ? "reaktion" : "reaktioner"}
    </button>
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

export default FeedPostCard;
