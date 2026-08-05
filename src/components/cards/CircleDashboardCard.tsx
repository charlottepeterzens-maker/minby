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
  onOpen: () => void;
}

/**
 * A circle on Hem. Answers one question: "Which circle should I open?"
 * Priority: circle name → most important event → up to two supporting
 * events → remaining activity → participants (supporting only).
 * Calm by design: no badges, no counters, no urgency.
 */
const CircleDashboardCard = ({ name, primary, supporting = [], remaining = 0, members, onOpen }: Props) => {
  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - visible.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-300 p-300 flex items-start gap-300 bg-butter-100"
    >
      <div className="flex-1 min-w-0 py-100">
        <Typography as="div" variant="body" className="truncate mb-200 text-berry-300">
          {name}
        </Typography>

        <Typography as="h3" variant="heading" className="line-clamp-2 text-foreground">
          {primary?.text ?? "Lugnt just nu"}
        </Typography>

        {supporting.length > 0 && (
          <ul className="mt-100 space-y-100">
            {supporting.slice(0, 2).map((h, i) => (
              <li key={i}>
                <Typography as="span" variant="section" className="block truncate text-foreground">
                  {h.text}
                </Typography>
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && (
          <Typography as="div" variant="body" className="mt-200 text-activity">
            +{remaining} {remaining === 1 ? "händelse till" : "fler händelser"}
          </Typography>
        )}
      </div>

      <div className="flex-shrink-0 w-[104px] relative h-[112px]">
        {visible[0] && <Avatar member={visible[0]} className="absolute top-0 left-0 w-12 h-12" />}
        {visible[1] && <Avatar member={visible[1]} className="absolute top-500 left-8 w-9 h-9" />}
        {visible[2] && !extra && <Avatar member={visible[2]} className="absolute top-100 right-0 w-14 h-14" />}
        {extra > 0 && (
          <div
            className={cn(
              typography.body,
              "absolute top-100 right-0 w-14 h-14 rounded-avatar flex items-center justify-center bg-breeze-100 ring-2 ring-activity text-foreground",
            )}
          >
            +{extra}
          </div>
        )}
        {visible[3] && <Avatar member={visible[3]} className="absolute bottom-0 left-0 w-12 h-12" />}
        {visible[4] && <Avatar member={visible[4]} className="absolute bottom-0 right-0 w-10 h-10" />}
      </div>
    </button>
  );
};

const Avatar = ({ member, className }: { member: CircleMemberPreview; className?: string }) => {
  const initials = (member.display_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        typography.meta,
        "rounded-avatar overflow-hidden flex items-center justify-center bg-breeze-100 ring-2 ring-activity text-foreground",
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
