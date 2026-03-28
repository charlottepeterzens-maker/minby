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
      whileTap={disabled ? undefined : { scale: 0.92 }}
      animate={active ? { scale: [1, 1.12, 1] } : {}}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="inline-flex items-center gap-1 rounded-full transition-colors"
      style={{
        padding: count > 0 ? "6px 12px" : "6px 8px",
        backgroundColor: active ? "#EDE8F4" : "transparent",
        border: active ? "1px solid #C9B8D8" : "1px solid transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon
        size={17}
        strokeWidth={1.8}
        style={{
          stroke: active ? "#3C2A4D" : "#C9B8D8",
          fill: active ? "#EDE8F4" : "none",
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
            color: active ? "#3C2A4D" : "#6B5C78",
          }}
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  );
};

export default ReactionButton;
