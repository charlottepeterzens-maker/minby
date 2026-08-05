import type { ReactNode } from "react";

interface Props {
  /** Left slot — typically the filter. */
  start: ReactNode;
  /** Right slot — typically the profile button. */
  end: ReactNode;
}

/** Stays visible while circles scroll beneath it. */
const StickyHeader = ({ start, end }: Props) => (
  <div className="sticky top-0 z-30 bg-background flex items-center justify-between gap-300 py-200">
    {start}
    {end}
  </div>
);

export default StickyHeader;
