import PollOption from "./PollOption";

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
  closesAt?: string | null;
  onVote: (index: number) => void;
  onClose?: () => void;
}

const CARD_YELLOW = "#F5EFD9";
const BURGUNDY = "#561828";

const monthNames = ["jan","feb","mars","april","maj","juni","juli","aug","sep","okt","nov","dec"];
const formatDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
};

/**
 * Poll card — presentational only. Voting logic lives in usePolls / the page.
 */
const PollCard = ({ question, authorName, options, myVote, closed, closesAt, onVote, onClose }: Props) => {
  const total = options.reduce((s, o) => s + o.votes, 0);

  const meta = closed
    ? "Avslutad omröstning"
    : closesAt
      ? `Omröstning · öppen till ${formatDay(closesAt)}`
      : "Omröstning";

  return (
    <div className="rounded-[26px] p-4" style={{ backgroundColor: CARD_YELLOW }}>
      <div className="text-[11px] mb-1 font-medium" style={{ color: "#675332" }}>
        {meta}
        {authorName ? ` · ${authorName}` : ""}
      </div>
      <h3 className="text-[17px] leading-snug mb-3" style={{ fontFamily: "'Outfit', sans-serif", color: "#2B2B2B" }}>
        {question}
      </h3>

      <div className="space-y-2">
        {options.map((o, i) => (
          <PollOption
            key={i}
            label={o.label}
            votes={o.votes}
            totalVotes={total}
            selected={myVote === i}
            disabled={closed}
            onSelect={() => onVote(i)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[13px]" style={{ color: "#675332" }}>
          {total === 0
            ? "Ingen har röstat ännu"
            : `${total} ${total === 1 ? "röst" : "röster"}${!closed && myVote !== null ? " · du kan ändra din röst" : ""}`}
        </span>
        {onClose && !closed && (
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] underline underline-offset-2 shrink-0"
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
