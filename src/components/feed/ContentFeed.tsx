import { FeedItemRenderer } from "./FeedItemRenderer";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

type Props = {
  items: any[];
  emptyMessage?: string;
  emptyAction?: { label: string; to: string };
  onRefresh?: () => void;
};

export const ContentFeed = ({ items, emptyMessage, emptyAction, onRefresh }: Props) => {
  const navigate = useNavigate();

  if (items.length === 0 && emptyMessage) {
    return (
      <motion.div
        className="flex flex-col items-center py-16 px-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-[13px] text-center"
          style={{ color: "hsl(var(--color-text-secondary))" }}
        >
          {emptyMessage}
        </p>
        {emptyAction && (
          <button
            onClick={() => navigate(emptyAction.to)}
            style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--accent))", background: "none", border: "none", cursor: "pointer", marginTop: 12 }}
          >
            {emptyAction.label}
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
    >
      {items.map((item, i) => (
        <motion.div
          key={item.data.id}
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          {i > 0 && <div style={{ height: 1, backgroundColor: "hsl(var(--color-border-subtle))" }} />}
          <FeedItemRenderer item={item} onRefresh={onRefresh} />
        </motion.div>
      ))}
    </motion.div>
  );
};
