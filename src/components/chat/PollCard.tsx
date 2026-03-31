import { useMemo } from "react";

interface PollCardProps {
  question: string;
  options: string[];
  votes: { user_id: string; option_index: number }[];
  currentUserId: string;
  onVote: (optionIndex: number) => void;
  creatorName: string;
  time: string;
}

const PollCard = ({
  question,
  options,
  votes,
  currentUserId,
  onVote,
  creatorName,
  time,
}: PollCardProps) => {
  const userVote = useMemo(
    () => votes.find((v) => v.user_id === currentUserId),
    [votes, currentUserId]
  );

  const totalVotes = votes.length;

  const voteCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    options.forEach((_, i) => (counts[i] = 0));
    votes.forEach((v) => {
      counts[v.option_index] = (counts[v.option_index] || 0) + 1;
    });
    return counts;
  }, [votes, options]);

  return (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: 280 }}
    >
      <div
        className="p-3 space-y-2.5"
        style={{
          backgroundColor: "hsl(var(--color-surface-card))",
          borderRadius: 8,
          boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
        }}
      >
        {/* Question */}
        <p
          className="text-[13px] font-medium leading-snug"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {question}
        </p>

        {/* Options */}
        <div className="space-y-1.5">
          {options.map((opt, i) => {
            const count = voteCounts[i] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = userVote?.option_index === i;

            return (
              <button
                key={i}
                onClick={() => !userVote && onVote(i)}
                disabled={!!userVote}
                className="w-full text-left relative overflow-hidden"
                style={{
                  borderRadius: 8,
                  boxShadow: "0 1px 3px 0 rgba(0,0,0,0.06)",
                  backgroundColor: isSelected ? "hsl(var(--color-surface-raised))" : "transparent",
                  padding: "8px 10px",
                }}
              >
                {/* Progress bar background */}
                <div
                  className="absolute inset-0 transition-all duration-500"
                  style={{
                    backgroundColor: "hsl(var(--color-border-lavender))",
                    opacity: 0.3,
                    width: `${pct}%`,
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <span
                    className="text-[12px]"
                    style={{
                      color: "hsl(var(--color-text-primary))",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {opt}
                  </span>
                  {userVote && (
                    <span
                      className="text-[10px] font-medium ml-2 shrink-0"
                      style={{ color: "hsl(var(--color-text-secondary))" }}
                    >
                      {count} ({pct}%)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
            {creatorName}
          </span>
          <span className="text-[10px]" style={{ color: "hsl(var(--color-text-muted))" }}>
            {totalVotes} röst{totalVotes !== 1 ? "er" : ""} · {time}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PollCard;
