import type { ReactNode } from "react";

interface Props {
  /** Left slot — typically the filter action. */
  filter: ReactNode;
  /** Right slot — typically the profile action. */
  profile: ReactNode;
}

/**
 * StickyHeader — stays visible while circles scroll beneath it.
 * It composes actions; it never implements them.
 */
const StickyHeader = ({ filter, profile }: Props) => (
  <div className="sticky top-0 z-30 bg-background py-100 flex items-center justify-end gap-200">
    {filter}
    {profile}
  </div>
);

export default StickyHeader;
