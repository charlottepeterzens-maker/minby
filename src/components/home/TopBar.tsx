import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface Props {
  /** Emotional welcome line — sets the tone for the page. */
  question: string;
  /** Collapse the bar (typically while scrolling). */
  hidden?: boolean;
}

/**
 * Home TopBar — a welcoming question, nothing more.
 * Disappears calmly on scroll and returns at the top of the page.
 */
const TopBar = ({ question, hidden = false }: Props) => (
  <div
    aria-hidden={hidden}
    className={cn(
      "overflow-hidden transition-all ease-standard duration-default",
      hidden ? "opacity-0 max-h-0 pt-0" : "opacity-100 max-h-40 pt-400",
    )}
  >
    <Typography as="h1" variant="display" className="text-foreground pb-400">
      {question}
    </Typography>
  </div>
);

export default TopBar;
