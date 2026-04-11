import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import FeedAvatar from "@/components/feed/FeedAvatar";
import ImageLightbox from "@/components/ImageLightbox";

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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--color-surface-card))",
        borderRadius: 8,
        border: "none",
        padding: 16,
      }}
    >
      {/* Row 1 – section label */}
      {post.sectionName && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A6A85" }}>
            {post.sectionName}
          </span>
        </div>
      )}

      {/* Header – avatar + name */}
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
            {timeAgo}
          </p>
        </div>
      </div>

      {/* Content – small image + text */}
      {signedUrl && post.photo_layout === "small" ? (
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <img
            src={signedUrl}
            alt=""
            onClick={() => setLightboxUrl(signedUrl)}
            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, flexShrink: 0, cursor: "pointer" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {post.content && (
              <p style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 15,
                fontWeight: 500,
                color: "hsl(var(--color-text-primary))",
                lineHeight: 1.4,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>{post.content}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {post.content && (
            <p style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 15,
              fontWeight: 500,
              color: "hsl(var(--color-text-primary))",
              lineHeight: 1.4,
              margin: "0 0 10px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>{post.content}</p>
          )}
        </>
      )}

      {/* Large image */}
      {signedUrl && post.photo_layout !== "small" && (
        <img
          src={signedUrl}
          alt=""
          onClick={() => setLightboxUrl(signedUrl)}
          style={{ width: "100%", marginBottom: 10, maxHeight: 280, objectFit: "cover", borderRadius: 6, cursor: "pointer" }}
        />
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

      {/* Föreslå att ses – mjukt, direkt under innehåll */}
      {!isOwn && onSuggestPlan && (
        <div style={{ marginTop: 6 }}>
          <button onClick={onSuggestPlan} style={{ fontSize: 11, color: "hsl(var(--color-text-faint))" }} className="hover:underline">
            Föreslå att ses →
          </button>
        </div>
      )}

      {/* Kommentarer */}
      <PostComments postId={post.id} isOwner={!!isOwn} collapsedInput />
      <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
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
    <button onClick={onShow} style={{ fontSize: 11, color: "hsl(var(--color-text-secondary))" }} className="hover:underline mt-1.5">
      {count === 1 ? "Någon reagerade" : `${count} personer har reagerat`}
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
