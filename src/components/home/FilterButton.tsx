import { useState } from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export type CircleFilter = "all" | "hangouts" | "tips" | "posts" | "photos" | "polls";

export const CIRCLE_FILTERS: { id: CircleFilter; label: string }[] = [
  { id: "all", label: "Allt" },
  { id: "hangouts", label: "Träffar" },
  { id: "tips", label: "Tips" },
  { id: "posts", label: "Inlägg" },
  { id: "photos", label: "Foton" },
  { id: "polls", label: "Omröstningar" },
];

interface Props {
  value: CircleFilter;
  onChange: (value: CircleFilter) => void;
}

/**
 * FilterButton — reusable filter UI and interaction state.
 * It only reports the selected filter; filtering itself lives elsewhere.
 */
const FilterButton = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Filtrera kretsar"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="w-10 h-10 shrink-0 rounded-avatar flex items-center justify-center bg-butter-100 text-foreground"
      >
        <SlidersHorizontal size={20} />
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

export default FilterButton;
