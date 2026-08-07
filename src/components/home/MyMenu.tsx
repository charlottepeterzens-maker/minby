import type { LucideIcon } from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import Typography from "@/components/ui/typography";
import { colors, radius, spacing } from "@/design-system";

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
  subtitle?: string;
  groups: MyMenuGroup[];
}

const MenuRow = ({
  item,
  onDone,
}: {
  item: MyMenuItem;
  onDone: () => void;
}) => {
  const Icon = item.icon;
  const color = item.accent
    ? colors.berry[300]
    : colors.text.ink;

  const handleSelect = () => {
    onDone();
    item.onSelect();
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleSelect}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          minHeight: spacing[400],
          gap: spacing[200],
          padding: 0,
          border: 0,
          background: "transparent",
          color,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <Icon
          size={20}
          aria-hidden="true"
          style={{
            flexShrink: 0,
          }}
        />

        <Typography
          as="span"
          variant="section"
          style={{
            flex: 1,
            color,
          }}
        >
          {item.label}
        </Typography>

        {item.badge && (
          <Typography
            as="span"
            variant="meta"
            style={{
              padding: `${spacing[100]} ${spacing[200]}`,
              borderRadius: radius.full,
              backgroundColor: colors.activity,
              color: colors.neutral.white,
            }}
          >
            {item.badge}
          </Typography>
        )}
      </button>
    </li>
  );
};

const MyMenu = ({
  open,
  onOpenChange,
  profile,
  subtitle,
  groups,
}: Props) => {
  const close = () => onOpenChange(false);

  const initials = (profile.display_name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{
          padding: spacing[400],
          backgroundColor: colors.neutral.egg,
        }}
      >
        <nav
          aria-label="Min meny"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[400],
          }}
        >
          <header
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: spacing[200],
            }}
          >
            <div
              style={{
                width: spacing[500],
                height: spacing[500],
                overflow: "hidden",
                borderRadius: radius.avatar,
                backgroundColor: colors.neutral.linen,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Typography
                  as="span"
                  variant="heading"
                  style={{
                    color: colors.text.ink,
                  }}
                >
                  {initials}
                </Typography>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: spacing[100],
              }}
            >
              <Typography
                as="h2"
                variant="display"
                style={{
                  color: colors.text.ink,
                  margin: 0,
                }}
              >
                {profile.display_name ?? "Du"}
              </Typography>

              {subtitle && (
                <Typography
                  as="p"
                  variant="body"
                  style={{
                    color: colors.text.ink,
                    margin: 0,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </div>
          </header>

          {groups.map((group) => (
            <section
              key={group.id}
              style={{
                paddingTop: spacing[400],
                borderTop: `1px solid ${colors.neutral.linen}`,
              }}
            >
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: spacing[200],
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {group.items.map((item) => (
                  <MenuRow
                    key={item.id}
                    item={item}
                    onDone={close}
                  />
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MyMenu;
