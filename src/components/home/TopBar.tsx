import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface Props {
  /** The welcoming question. Emotional, not functional. */
  question: string;
  /** Hidden while the user scrolls down; returns at the top. */
  hidden?: boolean;
}

/**
 * TopBar — sets the tone of Hem. Purely presentational.
 */
const TopBar = ({ question, hidden = false }: Props) => (
  <div
    aria-hidden={hidden}
    className={cn(
      "overflow-hidden transition-all ease-standard duration-default",
      hidden ? "max-h-0 opacity-0" : "max-h-40 opacity-100",
    )}
  >
    <Typography as="h1" variant="heading" className="pt-300 pb-100 pr-500 text-foreground">
      {question}
    </Typography>
  </div>
);

export default TopBar;
