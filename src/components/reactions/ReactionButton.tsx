import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface ReactionButtonProps {
  icon: LucideIcon;
  active: boolean;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const ReactionButton = ({
  icon: Icon,
  active,
  count = 0,
  disabled = false,
  onClick,
  onContextMenu,
}: ReactionButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      onContextMenu={onContextMenu}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.78 }}
      animate={active ? { scale: [1, 1.28, 0.88, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="inline-flex items-center gap-1 transition-colors"
      style={{
        padding: "4px 6px",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon
        size={17}
        strokeWidth={1.8}
        style={{
          stroke: active ? "#C4522A" : "#D4E8F5",
          fill: "none",
        }}
      />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: active ? "#C4522A" : "#6B5C78",
          }}
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  );
};

export default ReactionButton;
