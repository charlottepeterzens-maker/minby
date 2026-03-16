import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, UserPlus, Settings } from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

const navItems = [
  { label: "Hem", icon: Home, path: "/" },
  { label: "Profil", icon: User, path: "/profile" },
  { label: "Vänner", icon: UserPlus, path: "/friends" },
  { label: "Inställningar", icon: Settings, path: "/settings" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { count: unreadCount } = useUnreadNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/profile" && unreadCount > 0;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 relative transition-colors duration-150"
            >
              <div className="relative">
                <item.icon
                  className="w-5 h-5"
                  strokeWidth={1.5}
                  style={{ color: isActive ? "#3C2A4D" : "#9B8BA5" }}
                />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                    style={{ backgroundColor: "#E53E3E" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {isActive && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: "#3C2A4D" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
