import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface CreateHubAction {
  label: string;
  onSelect: () => void;
}

interface Props {
  actions: CreateHubAction[];
  title?: string;
  ariaLabel?: string;
}

/**
 * Minby Create Hub — the single floating "+" per view.
 * Tapping it opens a bottom sheet listing the create-actions
 * relevant to the current page. Replaces per-section "+"-buttons.
 */
const CreateHub = ({ actions, title = "Skapa nytt", ariaLabel = "Skapa nytt" }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
        style={{
          width: 64,
          height: 64,
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 16px)",
          backgroundColor: "#561828",
          color: "#FFFFFF",
        }}
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[26px] border-0 p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <SheetHeader className="px-5 pt-5 pb-2 flex-row items-center justify-between">
            <SheetTitle
              className="text-heading-md text-left"
              style={{ color: "#2B2B2B" }}
            >
              {title}
            </SheetTitle>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 -mr-2"
              aria-label="Stäng"
            >
              <X className="w-5 h-5" style={{ color: "#2B2B2B" }} />
            </button>
          </SheetHeader>
          <ul className="px-2 pb-8">
            {actions.map((a, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    // let the sheet close before opening a follow-up sheet
                    setTimeout(a.onSelect, 200);
                  }}
                  className="w-full text-left text-body px-3 py-4 rounded-[16px] active:opacity-70"
                  style={{ color: "#2B2B2B" }}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CreateHub;
