import { Typography } from "@/components/ui/typography";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";

export interface CircleHighlight {
  /** Short, curious line — never the full content. */
  text: string;
}

export interface CircleMemberPreview {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  name: string;
  /** The single most important thing that happened. */
  primary?: CircleHighlight | null;
  /** At most two supporting lines. */
  supporting?: CircleHighlight[];
  /** Number of further notifications, summarised as "+N fler notiser". */
  remaining?: number;
  members: CircleMemberPreview[];
  /** Members who created activity since the user was last here. */
  activeMemberIds?: string[];
  onOpen: () => void;
}

/**
 * A circle on Hem. Answers one question: "Which circle should I open?"
 * Priority: circle name → most important event → up to two supporting
 * events → remaining activity → participants (supporting only).
 * Calm by design: no badges, no counters, no urgency.
 */
const CircleDashboardCard = ({
  name,
  primary,
  supporting = [],
  remaining = 0,
  members,
  activeMemberIds = [],
  onOpen,
}: Props) => {
  const active = new Set(activeMemberIds);
  const visible = members.slice(0, 4);
  const extra = Math.max(0, members.length - visible.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-300 p-300 flex items-start gap-300 bg-butter-100"
    >
      <div className="flex-1 min-w-0 py-100">
        <Typography as="div" variant="meta" className="truncate mb-200 text-berry-300">
          {name}
        </Typography>

        <Typography as="h3" variant="body" className="line-clamp-2 text-foreground">
          {primary?.text ?? "Lugnt just nu"}
        </Typography>

        {supporting.length > 0 && (
          <ul className="mt-100 space-y-100">
            {supporting.slice(0, 2).map((h, i) => (
              <li key={i}>
                <Typography as="span" variant="body" className="block truncate text-foreground">
                  {h.text}
                </Typography>
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && (
          <Typography as="div" variant="meta" className="mt-200 text-activity">
            +{remaining} {remaining === 1 ? "händelse till" : "fler händelser"}
          </Typography>
        )}
      </div>

      <div className="flex-shrink-0 relative w-[112px] h-[112px]">

        {(extra > 0 ? visible.slice(0, SCATTER.length - 1) : visible).map((m, i) => (
          <div key={m.user_id} className="absolute" style={SCATTER[i]}>
            <Avatar member={m} active={active.has(m.user_id)} className="w-full h-full" />
          </div>
        ))}
        {extra > 0 && (
          <div className="absolute" style={SCATTER[SCATTER.length - 1]}>
            <div
              className={cn(
                typography.meta,
                "w-full h-full rounded-avatar flex items-center justify-center bg-breeze-100 text-foreground",
              )}
            >
              +{extra}
            </div>
          </div>
        )}
      </div>

    </button>
  );
};

const Avatar = ({
  member,
  active = false,
  className,
}: { member: CircleMemberPreview; active?: boolean; className?: string }) => {
  const initials = (member.display_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        typography.meta,
        "rounded-avatar overflow-hidden flex items-center justify-center bg-breeze-100 text-foreground",
        active && "ring-2 ring-activity",
        className,
      )}
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};


export default CircleDashboardCard;
