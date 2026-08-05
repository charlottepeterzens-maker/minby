import { Bell, CalendarCheck, Archive, SlidersHorizontal, MessageSquareHeart, HandHeart, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Typography } from "@/components/ui/typography";
import type { ProfileSummary } from "./ProfileButton";

export interface MyMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  accent?: boolean;
  onSelect: () => void;
}

export interface MyMenuGroup {
  id: string;
  items: MyMenuItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileSummary;
  /** e.g. "Du umgås i 12 kretsar, med 51 personer" */
  subtitle?: string;
  groups: MyMenuGroup[];
}

/** A single, reusable menu row. */
const MenuRow = ({ item, onDone }: { item: MyMenuItem; onDone: () => void }) => {
  const Icon = item.icon;
  const color = item.accent ? "hsl(var(--color-accent-terra))" : "hsl(var(--color-text-tertiary))";
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onDone();
          item.onSelect();
        }}
        className="w-full min-h-11 flex items-center gap-300 text-left"
      >
        <Icon size={20} style={{ color }} className="flex-shrink-0" />
        <Typography as="span" variant="section" className="flex-1" style={{ color }}>
          {item.label}
        </Typography>
        {item.badge && (
          <Typography
            as="span"
            variant="meta"
            className="px-200 py-100 rounded-avatar"
            style={{ backgroundColor: "hsl(var(--color-accent-terra))", color: "hsl(var(--background))" }}
          >
            {item.badge}
          </Typography>
        )}
      </button>
    </li>
  );
};

/**
 * MyMenu — the user's own space. Slides in from the profile button.
 * Contains no business logic; every action is supplied by the caller.
 */
const MyMenu = ({ open, onOpenChange, profile, subtitle, groups }: Props) => {
  const close = () => onOpenChange(false);
  const initials = (profile.display_name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[86%] max-w-sm bg-background border-0 p-0">
        <nav aria-label="Min meny" className="h-full overflow-y-auto px-400 pt-safe pb-safe flex flex-col justify-center gap-400">
          <div className="flex items-center gap-300">
            <div className="w-14 h-14 rounded-avatar overflow-hidden flex items-center justify-center bg-butter-100 flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name ?? "Min profilbild"} className="w-full h-full object-cover" />
              ) : (
                <Typography as="span" variant="heading" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                  {initials}
                </Typography>
              )}
            </div>
            <div className="min-w-0">
              <Typography as="h2" variant="display" style={{ color: "hsl(var(--color-text-tertiary))" }}>
                {profile.display_name ?? "Du"}
              </Typography>
              {subtitle && (
                <Typography as="p" variant="body" className="mt-100" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  {subtitle}
                </Typography>
              )}
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.id} className="pt-400 border-t border-border">
              <ul className="space-y-200">
                {g.items.map((item) => (
                  <MenuRow key={item.id} item={item} onDone={close} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MyMenu;
