import { useState } from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { CIRCLE_FILTERS, type CircleFilter } from "@/components/home/FilterButton";
import type { ProfileSummary } from "@/components/home/ProfileButton";

interface Props {
  value: CircleFilter;
  onChange: (value: CircleFilter) => void;
  profile: ProfileSummary;
  onOpenMenu: () => void;
}

const initialsOf = (name: string | null) =>
  (name ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/**
 * ProfileFilterPill — filter and profile joined into one squircle control.
 * Left half opens the filter sheet, right half opens the private menu.
 */
const ProfileFilterPill = ({ value, onChange, profile, onOpenMenu }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-stretch shrink-0 rounded-full overflow-hidden">
        <button
          type="button"
          aria-label="Filtrera kretsar"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-l-full flex items-center justify-center bg-breeze-300"
          style={{ color: "hsl(var(--text-inverse))" }}
        >
          <SlidersHorizontal size={20} />
        </button>

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Öppna min meny"
          aria-haspopup="dialog"
          className="w-12 h-12 rounded-r-full overflow-hidden flex items-center justify-center bg-butter-100"
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? "Min profilbild"}
              className="w-full h-full object-cover"
            />
          ) : (
            <Typography as="span" variant="action" style={{ color: "hsl(var(--color-text-tertiary))" }}>
              {initialsOf(profile.display_name)}
            </Typography>
          )}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetHeader title="Visa" />
          <BottomSheetBody className="px-300 pt-300 pb-500">
            <ul className="space-y-100">
              {CIRCLE_FILTERS.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(f.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full min-h-11 px-300 rounded-200 flex items-center justify-between text-left",
                      value === f.id && "bg-butter-100",
                    )}
                  >
                    <Typography as="span" variant="body" className="text-foreground">
                      {f.label}
                    </Typography>
                    {value === f.id && <Check size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheetBody>
        </BottomSheetContent>
      </Sheet>
    </>
  );
};

export default ProfileFilterPill;
