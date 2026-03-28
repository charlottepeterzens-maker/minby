import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface NotificationItem {
  id: string;
  body: string | null;
  created_at: string;
  read: boolean;
  from_user_name: string | null;
  from_user_avatar?: string | null;
}

interface Props {
  notifications: NotificationItem[];
  onClick: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
}

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just nu";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "igår";
  if (days < 7) return `${days} d sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
};

const NotificationList = ({ notifications, onClick, onMarkAllRead }: Props) => {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-4 rounded-xl p-3"
        style={{
          backgroundColor: "hsl(var(--color-surface-card))",
          border: "1px solid #EDE8F4",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium" style={{ color: "hsl(var(--color-text-secondary))" }}>
            Någon hörde av sig
          </span>
          {unread.length > 1 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] hover:underline transition-colors"
              style={{ color: "hsl(var(--color-text-secondary))" }}
            >
              Markera alla som lästa
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[200px] overflow-y-auto">
          {unread.map((n) => (
            <button
              key={n.id}
              onClick={() => onClick(n)}
              className="flex items-start gap-2.5 w-full text-left py-2 transition-colors hover:bg-[#FAFAFA] rounded-lg px-1 relative"
            >
              {/* Avatar */}
              <Avatar className="w-9 h-9 shrink-0">
                {n.from_user_avatar && <AvatarImage src={n.from_user_avatar} alt={n.from_user_name || ""} />}
                <AvatarFallback
                  className="text-[11px] font-medium"
                  style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))" }}
                >
                  {getInitials(n.from_user_name)}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-snug" style={{ color: "hsl(var(--color-text-primary))" }}>
                  {n.body || "Ny händelse"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--color-text-faint))" }}>
                  {timeAgo(n.created_at)}
                </p>
              </div>

              {/* Unread dot */}
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{ backgroundColor: "hsl(var(--color-border-lavender))" }}
              />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationList;
