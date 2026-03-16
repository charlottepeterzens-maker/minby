import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FeedHangoutCardProps {
  hangout: {
    id: string;
    date: string;
    activities: string[];
    custom_note: string | null;
    created_at: string;
    entry_type?: string;
  };
  profile: {
    display_name: string | null;
    initials: string;
  };
  isOwn?: boolean;
  onProfileClick: () => void;
  onJoin?: () => void;
  onMaybe?: () => void;
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

const DateColumn = ({ dateStr, light }: { dateStr: string; light?: boolean }) => {
  const dateObj = new Date(dateStr + "T00:00:00");
  const weekday = format(dateObj, "EEE", { locale: sv }).replace(".", "");
  const day = format(dateObj, "d");
  const month = format(dateObj, "MMM", { locale: sv }).replace(".", "");
  return (
    <div className="shrink-0 flex flex-col items-center justify-center w-10">
      <span className="text-[10px] font-medium leading-none uppercase" style={{ color: light ? '#E8D5DA' : '#3C2A4D' }}>{weekday}</span>
      <span className="text-[22px] leading-none font-medium mt-0.5" style={{ color: light ? '#FFFFFF' : '#3C2A4D' }}>{day}</span>
      <span className="text-[10px] font-medium leading-none mt-0.5 uppercase" style={{ color: '#C9B8D8' }}>{month}</span>
    </div>
  );
};

const CategoryPill = ({ label, variant }: { label: string; variant: "light" | "dark" }) => {
  if (variant === "dark") {
    return (
      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]" style={{ backgroundColor: '#3C2A4D', color: '#C9B8D8' }}>
        {label}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]" style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }}>
      {label}
    </span>
  );
};

// --- LEDIG CARD ---
const LedigCard = ({ hangout, profile, isOwn, onProfileClick, onJoin, onMaybe }: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  return (
    <div className="bg-card rounded-[14px] border-[0.5px] overflow-hidden" style={{ borderColor: '#EDE8F4' }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }} className="text-xs font-medium">{profile.initials}</AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button onClick={onProfileClick} className="text-sm font-medium text-foreground hover:underline block leading-tight">
                {isOwn ? "Du" : (profile.display_name || "Någon")}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">vill ses · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwn && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]" style={{ backgroundColor: '#F7F3EF', border: '0.5px solid #DDD5CC', color: '#7A6A85' }}>Ditt inlägg</span>
            )}
            <CategoryPill label="vill ses" variant="light" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-4 mb-3 rounded-[10px] p-3.5" style={{ backgroundColor: '#F7F3EF' }}>
        <div className="flex items-center">
          <DateColumn dateStr={hangout.date} />
          <div className="shrink-0 mx-3 self-stretch w-px" style={{ backgroundColor: '#EDE8F4' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug" style={{ color: '#3C2A4D' }}>
              {hangout.custom_note || "Vill ses"}
            </p>
          </div>
        </div>
      </div>

      {!isOwn && (
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onJoin} className="flex-1 text-[13px] font-medium py-2 rounded-[10px] transition-colors" style={{ backgroundColor: '#EAF2E8', color: '#1F4A1A' }}>
            Ja, jag är med!
          </button>
          <button onClick={onMaybe} className="flex-1 text-[13px] font-medium py-2 rounded-[10px] bg-card text-muted-foreground border-[0.5px] transition-colors hover:bg-muted" style={{ borderColor: '#EDE8F4' }}>
            Kanske
          </button>
        </div>
      )}
    </div>
  );
};

// --- PLAN CARD ---
const PlanCard = ({ hangout, profile, isOwn, onProfileClick, onJoin, onMaybe }: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  const activityName = hangout.custom_note || (hangout.activities.length > 0 ? hangout.activities[0] : "Plan");

  return (
    <div className="bg-card rounded-[14px] border-[0.5px] overflow-hidden" style={{ borderColor: '#EDE8F4' }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }} className="text-xs font-medium">{profile.initials}</AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button onClick={onProfileClick} className="text-sm font-medium text-foreground hover:underline block leading-tight">
                {isOwn ? "Du" : (profile.display_name || "Någon")}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">häng med · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwn && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]" style={{ backgroundColor: '#F7F3EF', border: '0.5px solid #DDD5CC', color: '#7A6A85' }}>Ditt inlägg</span>
            )}
            <CategoryPill label="häng med" variant="dark" />
          </div>
        </div>
      </div>

      {/* Dark content area */}
      <div className="mx-4 mb-3 rounded-[10px] p-3.5" style={{ backgroundColor: '#3C2A4D' }}>
        <div className="flex items-center">
          <DateColumn dateStr={hangout.date} light />
          <div className="shrink-0 mx-3 self-stretch w-px" style={{ backgroundColor: '#C9B8D8', opacity: 0.3 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-snug text-white">{activityName}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {/* Overlapping initials */}
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border-[1.5px]" style={{ backgroundColor: '#C9B8D8', color: '#3C2A4D', borderColor: '#3C2A4D' }}>
                  {profile.initials.charAt(0)}
                </div>
              </div>
              <span style={{ color: '#C9B8D8', fontSize: '10px' }}>
                {profile.display_name || "Någon"} · <span style={{ color: '#7A6A85', fontSize: '10px' }}>häng med!</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isOwn && (
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onJoin} className="flex-1 text-[13px] font-medium py-2 rounded-[10px] transition-colors" style={{ backgroundColor: '#EAF2E8', color: '#1F4A1A' }}>
            Jag hänger med!
          </button>
          <button onClick={onMaybe} className="flex-1 text-[13px] font-medium py-2 rounded-[10px] bg-card text-muted-foreground border-[0.5px] transition-colors hover:bg-muted" style={{ borderColor: '#EDE8F4' }}>
            Kanske
          </button>
        </div>
      )}
    </div>
  );
};

// --- ACTIVITY CARD ---
const ActivityCard = ({ hangout, profile, isOwn, onProfileClick, onJoin }: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  const activityName = hangout.activities.length > 0 ? hangout.activities[0] : (hangout.custom_note || "Aktivitet");
  const dateObj = new Date(hangout.date + "T00:00:00");
  const dateChip = `${format(dateObj, "EEE", { locale: sv }).replace(".", "")} ${format(dateObj, "d/M")}`;

  return (
    <div className="bg-card rounded-[14px] border-[0.5px] overflow-hidden" style={{ borderColor: '#EDE8F4' }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }} className="text-xs font-medium">{profile.initials}</AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button onClick={onProfileClick} className="text-sm font-medium text-foreground hover:underline block leading-tight">
                {isOwn ? "Du" : (profile.display_name || "Någon")}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">sugen på · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwn && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]" style={{ backgroundColor: '#F7F3EF', border: '0.5px solid #DDD5CC', color: '#7A6A85' }}>Ditt inlägg</span>
            )}
            <CategoryPill label="sugen på" variant="light" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-4 mb-3">
        <p className="text-[14px] font-medium mb-2" style={{ color: '#3C2A4D' }}>{activityName}</p>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5" style={{ backgroundColor: '#F7F3EF' }}>
            <span className="text-[12px] font-medium" style={{ color: '#3C2A4D' }}>{dateChip}</span>
            {!isOwn && (
              <button
                onClick={onJoin}
                className="text-[11px] font-medium px-2 py-0.5 rounded-[8px] transition-colors"
                style={{ backgroundColor: '#EAF2E8', color: '#1F4A1A' }}
              >
                Ja!
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-px mx-4" style={{ backgroundColor: '#EDE8F4' }} />
      <div className="px-4 py-2">
        {hangout.custom_note && (
          <p className="text-[12px] text-muted-foreground">{hangout.custom_note}</p>
        )}
      </div>
    </div>
  );
};

const FeedHangoutCard = (props: FeedHangoutCardProps) => {
  const entryType = props.hangout.entry_type || "available";

  if (entryType === "confirmed") return <PlanCard {...props} />;
  if (entryType === "activity") return <ActivityCard {...props} />;
  return <LedigCard {...props} />;
};

export default FeedHangoutCard;
