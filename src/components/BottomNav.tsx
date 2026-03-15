import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, UsersRound, Settings } from "lucide-react";

const navItems = [
  { label: "Hem", icon: Home, path: "/" },
  { label: "Profil", icon: User, path: "/profile" },
  { label: "Grupper", icon: UsersRound, path: "/groups" },
  { label: "Inställningar", icon: Settings, path: "/settings" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 relative transition-colors duration-150"
            >
              <item.icon
                className={`w-5 h-5 ${isActive ? "text-primary" : "text-accent"}`}
                strokeWidth={1.5}
              />
              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
