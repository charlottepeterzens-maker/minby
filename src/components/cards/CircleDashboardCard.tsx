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
  highlights: CircleHighlight[];
  members: CircleMemberPreview[];
  onOpen: () => void;
}

/**
 * A circle on Hem: a small dashboard that tells the user why this circle
 * matters right now. Shows at most three current happenings — never the
 * content itself.
 */
const CircleDashboardCard = ({ name, highlights, members, onOpen }: Props) => {
  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - visible.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-[26px] p-5 flex gap-4 bg-butter-100"
    >

      <div className="flex-1 min-w-0">
        <Typography as="h3" variant="heading" style={{ color: "hsl(var(--color-text-primary))" }}>
          {name}
        </Typography>

        <ul className="mt-3 space-y-1.5">
          {highlights.length ? (
            highlights.slice(0, 3).map((h, i) => (
              <li key={i}>
                <Typography as="span" variant="body" className="block truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                  {h.text}
                </Typography>
              </li>
            ))
          ) : (
            <li>
              <Typography as="span" variant="body" className="block" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                Lugnt just nu.
              </Typography>
            </li>
          )}
        </ul>
      </div>

      <div className="flex-shrink-0 w-[92px] relative h-[92px]">
        {visible[0] && <Avatar member={visible[0]} className="absolute top-0 right-0 w-12 h-12" />}
        {visible[1] && <Avatar member={visible[1]} className="absolute top-8 left-0 w-11 h-11" />}
        {visible[2] && !extra && <Avatar member={visible[2]} className="absolute bottom-0 right-2 w-10 h-10" />}
        {extra > 0 && (
          <div
            className={cn(typography.label, "absolute bottom-0 right-2 w-10 h-10 rounded-[32%] flex items-center justify-center")}
            style={{ backgroundColor: "#DCEAF8", color: "hsl(var(--color-text-primary))" }}
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
      className={cn(typography.label, "rounded-[32%] overflow-hidden flex items-center justify-center", className)}
      style={{ backgroundColor: "#DCEAF8", color: "hsl(var(--color-text-primary))" }}
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
