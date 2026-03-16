import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";

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
}

const FeedPostCard = ({ post, profile, isOwn, onProfileClick }: FeedPostCardProps) => {
  const timeAgo = getTimeAgo(post.created_at);
  const [showReactions, setShowReactions] = useState(false);
  const signedUrl = useSignedImageUrl(post.image_url);

  return (
    <div className="bg-card rounded-[14px] border-[0.5px] border-border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <button onClick={onProfileClick} className="shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarFallback style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }} className="text-xs font-medium">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
          </button>
          <div>
            <button onClick={onProfileClick} className="text-sm font-medium text-foreground hover:underline block leading-tight">
              {isOwn ? "Du" : (profile.display_name || "Någon")}
            </button>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {post.sectionName} · {timeAgo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isOwn && (
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]"
              style={{ backgroundColor: '#F7F3EF', border: '0.5px solid #DDD5CC', color: '#7A6A85' }}
            >
              Ditt inlägg
            </span>
          )}
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px] border-[0.5px] border-border bg-muted text-foreground">
            {post.sectionName}
          </span>
        </div>
      </div>

      {/* Large photo layout (default) */}
      {signedUrl && post.photo_layout !== "small" && (
        <img
          src={signedUrl}
          alt=""
          className="w-full mb-3 max-h-72 object-cover rounded-[10px]"
        />
      )}

      {/* Small photo layout */}
      {signedUrl && post.photo_layout === "small" ? (
        <div className="flex gap-3 mb-2">
          <img
            src={signedUrl}
            alt=""
            className="shrink-0 w-20 h-20 object-cover rounded-[10px]"
          />
          <div className="flex-1 min-w-0">
            {post.content && (
              <p className="text-[13px] text-foreground leading-[1.55]">
                {post.content}
              </p>
            )}
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-[13px] text-foreground leading-[1.55] mb-2">
            {post.content}
          </p>
        )
      )}

      {/* Reactions */}
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

      {/* Comments */}
      <PostComments postId={post.id} isOwner={!!isOwn} />
    </div>
  );
};

/** Small link that shows reaction count for own posts */
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
    <button
      onClick={onShow}
      className="text-[11px] text-muted-foreground hover:underline mt-1.5"
    >
      Se reaktioner ({count})
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
