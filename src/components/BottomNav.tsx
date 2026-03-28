import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, UserPlus, Settings } from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { motion } from "framer-motion";

const navItems = [
  { label: "Hemma", icon: Home, path: "/" },
  { label: "Mitt", icon: User, path: "/profile" },
  { label: "Min krets", icon: UserPlus, path: "/friends" },
  { label: "Inställningar", icon: Settings, path: "/settings" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { count: unreadCount } = useUnreadNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom" aria-label="Huvudnavigering">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2" role="list">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/profile" && unreadCount > 0;

          return (
            <motion.button
              key={item.label}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex flex-col items-center gap-1 px-4 py-1.5 relative min-w-[44px] min-h-[44px]"
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              role="listitem"
            >
              <motion.div
                className="relative"
                animate={{ y: isActive ? -2 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <item.icon
                  className="w-5 h-5 transition-colors duration-200"
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ color: isActive ? "#3C2A4D" : "#6B5C78" }}
                />
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                    style={{ backgroundColor: "#993556" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </motion.div>
              {isActive && (
                <motion.span
                  layoutId="nav-dot"
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: "#3C2A4D" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
