interface Props {
  label: string;
  votes: number;
  totalVotes: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * A single poll option. Presentation only — the parent owns the state.
 */
import Typography from "@/components/ui/typography";

const PollOption = ({ label, votes, totalVotes, selected, disabled, onSelect }: Props) => {
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className="relative w-full text-left rounded-200 overflow-hidden px-300 py-3 disabled:cursor-default active:opacity-80 transition-opacity"
      style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
    >
      <span
        className="absolute inset-y-0 left-0 transition-[width] duration-slow ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: selected ? "rgba(86,24,40,0.16)" : "rgba(86,24,40,0.07)",
        }}
      />
      <span className="relative flex items-center justify-between gap-3">
        <Typography
          variant={selected ? "action" : "body"}
          as="span"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {label}
        </Typography>
        <Typography variant="meta" as="span" className="shrink-0 tabular-nums" style={{ color: "hsl(var(--color-text-tertiary))" }}>
          {votes}
        </Typography>
      </span>
    </button>
  );
};

export default PollOption;
