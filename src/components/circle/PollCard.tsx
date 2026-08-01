import { Typography } from "@/components/ui/typography";

export interface PollOptionResult {
  label: string;
  votes: number;
}

interface Props {
  question: string;
  authorName?: string;
  options: PollOptionResult[];
  /** Index of the current user's vote, or null. */
  myVote: number | null;
  closed?: boolean;
  onVote: (index: number) => void;
  onClose?: () => void;
}

const CARD_YELLOW = "#F5EFD9";
const BURGUNDY = "#561828";

/**
 * Poll card — presentational only. Voting logic lives in the page.
 */
const PollCard = ({ question, authorName, options, myVote, closed, onVote, onClose }: Props) => {
  const total = options.reduce((s, o) => s + o.votes, 0);

  return (
    <div className="rounded-[26px] p-4" style={{ backgroundColor: CARD_YELLOW }}>
      <div className="text-[11px] mb-1 font-medium" style={{ color: "#675332" }}>
        {closed ? "Avslutad omröstning" : "Omröstning"}
        {authorName ? ` · ${authorName}` : ""}
      </div>
      <Typography variant="bodyMd" className="mb-3" style={{ color: "#2B2B2B" }}>
        {question}
      </Typography>

      <div className="space-y-2">
        {options.map((o, i) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const mine = myVote === i;
          return (
            <button
              key={i}
              type="button"
              disabled={closed}
              onClick={() => onVote(i)}
              aria-pressed={mine}
              className="relative w-full text-left rounded-[16px] overflow-hidden px-3 py-2.5 disabled:cursor-default active:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
            >
              <span
                className="absolute inset-y-0 left-0 transition-[width] duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: mine ? "rgba(86,24,40,0.16)" : "rgba(86,24,40,0.07)",
                }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-[15px]" style={{ color: "#2B2B2B", fontWeight: mine ? 600 : 400 }}>
                  {o.label}
                </span>
                <span className="text-[13px] shrink-0" style={{ color: "#675332" }}>
                  {o.votes} {o.votes === 1 ? "röst" : "röster"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[13px]" style={{ color: "#675332" }}>
          {total === 0 ? "Ingen har röstat ännu" : `${total} ${total === 1 ? "röst" : "röster"} totalt`}
        </span>
        {onClose && !closed && (
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] underline underline-offset-2"
            style={{ color: BURGUNDY }}
          >
            Avsluta
          </button>
        )}
      </div>
    </div>
  );
};

export default PollCard;
