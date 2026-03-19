import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FeedHealthCardProps {
  post: {
    id: string;
    content: string | null;
    created_at: string;
    sectionName: string;
  };
  profile: {
    display_name: string | null;
    initials: string;
  };
  isOwn?: boolean;
  onProfileClick: () => void;
  onSendHug?: () => void;
}

const FeedHealthCard = ({ post, profile, isOwn, onProfileClick, onSendHug }: FeedHealthCardProps) => {
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <div className="bg-card rounded-[14px] border border-border overflow-hidden">
      <div className="m-3 rounded-[10px] bg-dusty-rose-bg p-4">
        <div className="flex items-start justify-between">
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
                {post.content || "Behöver lite ro"}
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
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px] bg-dusty-rose text-foreground">
              PMS
            </span>
          </div>
        </div>
      </div>

      {/* Send hug button - hide for own posts */}
      {!isOwn && (
        <div className="px-4 pb-4">
          <button
            onClick={onSendHug}
            className="text-[13px] font-medium px-4 py-2 rounded-[10px] bg-dusty-rose-bg text-foreground border border-dusty-rose transition-colors hover:bg-dusty-rose"
          >
            Skicka kärlek
          </button>
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
