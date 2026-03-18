import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface NotificationItem {
  id: string;
  body: string | null;
  created_at: string;
  read: boolean;
  from_user_name: string | null;
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
        className="mb-4 rounded-[12px] p-3"
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #EDE8F4",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium" style={{ color: "#7A6A85" }}>
            Någon hörde av sig
          </span>
          {unread.length > 1 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] hover:underline transition-colors"
              style={{ color: "#7A6A85" }}
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
                <AvatarFallback
                  className="text-[11px] font-medium"
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                >
                  {getInitials(n.from_user_name)}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-snug" style={{ color: "#3C2A4D" }}>
                  {n.body || "Ny händelse"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#B0A8B5" }}>
                  {timeAgo(n.created_at)}
                </p>
              </div>

              {/* Unread dot */}
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{ backgroundColor: "#C9B8D8" }}
              />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationList;
