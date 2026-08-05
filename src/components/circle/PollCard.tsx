import PollOption from "./PollOption";
import Typography from "@/components/ui/typography";

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
    <div className="rounded-300 p-300" style={{ backgroundColor: CARD_YELLOW }}>
      <Typography variant="meta" as="div" className="mb-1" style={{ color: "hsl(var(--color-text-tertiary))" }}>
        {meta}
        {authorName ? ` · ${authorName}` : ""}
      </Typography>
      <Typography variant="heading" as="h3" className="mb-3" style={{ color: "hsl(var(--color-text-primary))" }}>
        {question}
      </Typography>

      <div className="space-y-200">
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
        <Typography variant="meta" as="span" style={{ color: "hsl(var(--color-text-tertiary))" }}>
          {total === 0
            ? "Ingen har röstat ännu"
            : `${total} ${total === 1 ? "röst" : "röster"}${!closed && myVote !== null ? " · du kan ändra din röst" : ""}`}
        </Typography>
        {onClose && !closed && (
          <Typography
            variant="meta"
            as="button"
            onClick={onClose}
            className="underline underline-offset-2 shrink-0"
            style={{ color: BURGUNDY }}
          >
            Avsluta
          </Typography>
        )}
      </div>
    </div>
  );
};

export default PollCard;
