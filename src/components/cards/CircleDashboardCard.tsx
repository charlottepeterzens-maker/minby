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
  /** Number of further events, summarised as "+N fler händelser". */
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
      className="w-full text-left rounded-300 px-300 py-300 flex items-center gap-300 bg-butter-100"
    >
      <div className="flex-1 min-w-0">
        <Typography as="div" variant="meta" style={{ color: "hsl(var(--color-text-tertiary))" }}>
          {name}
        </Typography>

        <Typography
          as="h3"
          variant="heading"
          className="mt-1 line-clamp-2"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {primary?.text ?? "Lugnt just nu"}
        </Typography>

        {supporting.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {supporting.slice(0, 2).map((h, i) => (
              <li key={i}>
                <Typography
                  as="span"
                  variant="body"
                  className="block truncate"
                  style={{ color: "hsl(var(--color-text-secondary))" }}
                >
                  {h.text}
                </Typography>
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && (
          <Typography as="div" variant="meta" className="mt-2" style={{ color: "hsl(var(--color-text-tertiary))" }}>
            +{remaining} fler händelser
          </Typography>
        )}
      </div>

      <div className="flex-shrink-0 w-[72px] relative h-[72px]">
        {visible[0] && <Avatar member={visible[0]} className="absolute top-0 right-0 w-10 h-10" />}
        {visible[1] && <Avatar member={visible[1]} className="absolute top-6 left-0 w-9 h-9" />}
        {visible[2] && !extra && <Avatar member={visible[2]} className="absolute bottom-0 right-1 w-8 h-8" />}
        {extra > 0 && (
          <div
            className={cn(typography.meta, "absolute bottom-0 right-1 w-8 h-8 rounded-avatar flex items-center justify-center bg-breeze-100")}
            style={{ color: "hsl(var(--color-text-primary))" }}
          >
            +{extra}
          </div>
        )}
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
      className={cn(typography.label, "rounded-avatar overflow-hidden flex items-center justify-center bg-breeze-100", className)}
      style={{ color: "hsl(var(--color-text-primary))" }}
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
