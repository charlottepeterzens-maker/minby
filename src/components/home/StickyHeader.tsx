import type { ReactNode } from "react";

interface Props {
  /** Right-aligned actions — typically the joined filter/profile pill. */
  actions: ReactNode;
}

/**
 * StickyHeader — stays visible while circles scroll beneath it.
 * It composes actions; it never implements them.
 */
const StickyHeader = ({ actions }: Props) => (
  <div className="sticky top-0 z-30 bg-background py-100 flex items-center justify-end">
    {actions}
  </div>
);

export default StickyHeader;
