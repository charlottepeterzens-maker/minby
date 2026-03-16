import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PostReactions from "@/components/profile/PostReactions";

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
  onProfileClick: () => void;
}

const FeedPostCard = ({ post, profile, onProfileClick }: FeedPostCardProps) => {
  const timeAgo = getTimeAgo(post.created_at);

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
              {profile.display_name || "Någon"}
            </button>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {post.sectionName} · {timeAgo}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px] border-[0.5px] border-border bg-muted text-foreground">
          {post.sectionName}
        </span>
      </div>

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="w-full mb-3 max-h-72 object-cover rounded-[10px]"
        />
      )}

      {/* Content */}
      {post.content && (
        <p className="text-[13px] text-foreground leading-[1.55] mb-2">
          {post.content}
        </p>
      )}

      {/* Reactions */}
      <PostReactions postId={post.id} />
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

export default FeedPostCard;
