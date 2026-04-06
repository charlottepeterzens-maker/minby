import { FeedItemRenderer } from "./FeedItemRenderer";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

type Props = {
  items: any[];
  emptyMessage?: string;
  onRefresh?: () => void;
};

export const ContentFeed = ({ items, emptyMessage }: Props) => {
  if (items.length === 0 && emptyMessage) {
    return (
      <motion.div
        className="flex flex-col items-center py-16 px-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "#EAF2E8" }}
        >
          <CalendarDays className="w-6 h-6" style={{ color: "#4A7A5E" }} strokeWidth={1.5} />
        </div>
        <p
          className="font-fraunces text-[16px] font-medium text-center mb-1"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {emptyMessage}
        </p>
        <p
          className="text-[13px] text-center"
          style={{ color: "hsl(var(--color-text-secondary))" }}
        >
          Här dyker det upp när någon i din krets vill ses
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedItemRenderer key={item.data.id} item={item} />
      ))}
    </div>
  );
};
