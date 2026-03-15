import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeedHangoutCardProps {
  hangout: {
    id: string;
    date: string;
    activities: string[];
    custom_note: string | null;
    created_at: string;
  };
  profile: {
    display_name: string | null;
    initials: string;
  };
  onProfileClick: () => void;
  onJoin?: () => void;
  onMaybe?: () => void;
}

const FeedHangoutCard = ({ hangout, profile, onProfileClick, onJoin, onMaybe }: FeedHangoutCardProps) => {
  const { t } = useLanguage();
  const timeAgo = getTimeAgo(hangout.created_at);

  const formattedDate = new Date(hangout.date).toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="bg-card rounded-[14px] border-[0.5px] border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
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
                {profile.display_name || "Någon"}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Vill ses · {timeAgo}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px] border-[0.5px] border-border bg-muted text-foreground">
            dejt
          </span>
        </div>
      </div>

      {/* Dark purple content area */}
      <div className="mx-4 mb-3 rounded-[10px] bg-primary p-3.5">
        {/* Date chip */}
        <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-[20px] bg-secondary text-secondary-foreground mb-2.5">
          {formattedDate}
        </span>

        {/* Activity pills */}
        {hangout.activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hangout.activities.map((activity) => (
              <span
                key={activity}
                className="text-[11px] font-medium px-3 py-1 rounded-[20px] bg-primary-foreground/15 text-primary-foreground"
              >
                {activity}
              </span>
            ))}
          </div>
        )}

        {/* Custom note */}
        {hangout.custom_note && (
          <p className="text-[12px] text-primary-foreground/80 mt-2">{hangout.custom_note}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onJoin}
          className="flex-1 text-[13px] font-medium py-2 rounded-[10px] bg-salvia-bg text-accent-foreground border-[0.5px] border-accent/30 transition-colors hover:bg-salvia"
        >
          Ja, jag är med!
        </button>
        <button
          onClick={onMaybe}
          className="flex-1 text-[13px] font-medium py-2 rounded-[10px] bg-card text-muted-foreground border-[0.5px] border-border transition-colors hover:bg-muted"
        >
          Kanske
        </button>
      </div>
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

export default FeedHangoutCard;
