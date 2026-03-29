import { useRef, useState, type ReactNode } from "react";
import { Reply } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface SwipeableMessageProps {
  children: ReactNode;
  isOwn: boolean;
  onReply: () => void;
}

const SWIPE_THRESHOLD = 60;

const SwipeableMessage = ({ children, isOwn, onReply }: SwipeableMessageProps) => {
  const x = useMotionValue(0);
  const [swiping, setSwiping] = useState(false);
  const triggered = useRef(false);

  // Swipe direction: own messages swipe right-to-left, others left-to-right
  const direction = isOwn ? -1 : 1;

  // Reply icon opacity and position based on drag
  const iconOpacity = useTransform(x, [0, direction * SWIPE_THRESHOLD * 0.5, direction * SWIPE_THRESHOLD], [0, 0.4, 1]);
  const iconScale = useTransform(x, [0, direction * SWIPE_THRESHOLD], [0.5, 1]);

  const handleDragEnd = () => {
    setSwiping(false);
    if (triggered.current) {
      onReply();
      triggered.current = false;
    }
    animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
  };

  return (
    <div className="relative overflow-visible">
      {/* Reply icon indicator */}
      <motion.div
        className="absolute top-1/2 flex items-center justify-center"
        style={{
          [isOwn ? "left" : "right"]: -4,
          y: "-50%",
          opacity: iconOpacity,
          scale: iconScale,
          color: "hsl(var(--color-text-secondary))",
        }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}>
          <Reply className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
        </div>
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: isOwn ? -100 : 0, right: isOwn ? 0 : 100 }}
        dragElastic={0.3}
        dragDirectionLock
        onDragStart={() => { setSwiping(true); triggered.current = false; }}
        onDrag={(_, info) => {
          const offset = info.offset.x;
          // Check if swipe passes threshold in correct direction
          if ((isOwn && offset < -SWIPE_THRESHOLD) || (!isOwn && offset > SWIPE_THRESHOLD)) {
            if (!triggered.current) {
              triggered.current = true;
              // Haptic feedback if available
              if (navigator.vibrate) navigator.vibrate(10);
            }
          } else {
            triggered.current = false;
          }
        }}
        onDragEnd={handleDragEnd}
        className={swiping ? "cursor-grabbing" : ""}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
