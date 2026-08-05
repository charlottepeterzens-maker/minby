import type { ReactNode } from "react";
import CircleDashboardCard, {
  type CircleHighlight,
  type CircleMemberPreview,
} from "@/components/cards/CircleDashboardCard";
import { CircleCardSkeleton } from "@/components/cards/CardSkeletons";

export interface CircleListItem {
  id: string;
  name: string;
  primary: CircleHighlight | null;
  supporting: CircleHighlight[];
  remaining: number;
  members: CircleMemberPreview[];
}

interface Props {
  circles: CircleListItem[];
  loading?: boolean;
  emptyState?: ReactNode;
  onOpen: (id: string) => void;
}

/**
 * Renders the circles. Works unchanged for zero, one or many circles —
 * it never defines how a CircleCard looks.
 */
const CircleList = ({ circles, loading = false, emptyState, onOpen }: Props) => {
  if (loading) {
    return (
      <div className="space-y-300">
        <CircleCardSkeleton />
        <CircleCardSkeleton />
      </div>
    );
  }

  if (circles.length === 0) return <>{emptyState}</>;

  return (
    <ul className="space-y-300">
      {circles.map((c) => (
        <li key={c.id}>
          <CircleDashboardCard
            name={c.name}
            primary={c.primary}
            supporting={c.supporting}
            remaining={c.remaining}
            members={c.members}
            onOpen={() => onOpen(c.id)}
          />
        </li>
      ))}
    </ul>
  );
};

export default CircleList;
