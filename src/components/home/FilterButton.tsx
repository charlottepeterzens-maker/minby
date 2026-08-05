import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { CIRCLE_FILTERS, type CircleFilterId } from "./types";

interface Props {
  value: CircleFilterId;
  onChange: (value: CircleFilterId) => void;
}

/**
 * Reusable filter entry point for the circle list.
 * Owns only the interaction state — filtering itself lives with the caller.
 */
const FilterButton = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const active = CIRCLE_FILTERS.find((f) => f.id === value) ?? CIRCLE_FILTERS[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filtrera kretsar, valt: ${active.label}`}
        className="min-h-11 min-w-11 px-300 flex items-center gap-200 rounded-100 text-foreground"
      >
        <SlidersHorizontal size={20} aria-hidden />
        <Typography as="span" variant="action">{active.label}</Typography>
      </button>

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
                    aria-pressed={f.id === value}
                    className={cn(
                      "w-full text-left min-h-11 px-300 rounded-200 transition-colors duration-fast",
                      f.id === value ? "bg-butter-100" : "bg-transparent",
                    )}
                  >
                    <Typography as="span" variant="body" className="text-foreground">
                      {f.label}
                    </Typography>
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

export default FilterButton;
