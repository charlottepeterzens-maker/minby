import FeedAvatar from "@/components/feed/FeedAvatar";

interface FeedTipCardProps {
  tip: {
    id: string;
    title: string;
    comment: string | null;
    category: string;
    url: string | null;
    created_at: string;
  };
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    initials: string;
  };
  onProfileClick: () => void;
}

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

const FeedTipCard = ({ tip, profile, onProfileClick }: FeedTipCardProps) => {
  const timeAgo = getTimeAgo(tip.created_at);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#EDE8F4" }}
    >
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
            className="text-sm font-medium hover:underline block leading-tight"
            style={{ color: "#3C2A4D" }}
          >
            {profile.display_name || "Någon"}
          </button>
          <p className="text-[11px] leading-tight" style={{ color: "#7A6A85" }}>
            delade ett tips · {timeAgo}
          </p>
        </div>
      </div>

      <p className="text-[14px] font-medium leading-snug" style={{ color: "#3C2A4D" }}>
        {tip.title}
      </p>

      {tip.comment && (
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "#7A6A85" }}>
          {tip.comment}
        </p>
      )}

      {tip.url && (
        <a
          href={tip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] mt-2 inline-block hover:underline"
          style={{ color: "#B0A0B5" }}
        >
          Källa →
        </a>
      )}
    </div>
  );
};

export default FeedTipCard;
