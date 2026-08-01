import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";

export interface PrimaryAction {
  label: string;
  onSelect: () => void;
  /** Keep the sheet open (used when layering another sheet on top). */
  keepOpen?: boolean;
  disabled?: boolean;
}

interface Props {
  /** The actions this page wants to expose. */
  options: PrimaryAction[];
  title?: string;
  ariaLabel?: string;
}

/**
 * Minby PrimaryActionButton — the single primary creation entry point per view.
 *
 * Renders a fixed squircle button and presents the supplied options in the
 * shared bottom sheet. It holds no page specific logic; every page passes its
 * own options.
 */
const PrimaryActionButton = ({
  options,
  title = "Vad vill du göra?",
  ariaLabel = "Öppna åtgärder",
}: Props) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (a: PrimaryAction) => {
    if (a.disabled) return;
    if (!a.keepOpen) setOpen(false);
    setTimeout(a.onSelect, a.keepOpen ? 0 : 200);
  };

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center justify-center rounded-[32%]"
        style={{
          width: 58,
          height: 58,
          right: "calc(max(16px, env(safe-area-inset-right)) + 8px)",
          bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 32px)",
          backgroundColor: "#561828",
          color: "#FFFFFF",
        }}
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetHeader title={title} />
          <BottomSheetBody className="px-2 pt-4 pb-8">
            <ul className="space-y-1">
              {options.map((a, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSelect(a)}
                    disabled={a.disabled}
                    className={cn(typography.body, "w-full text-left px-3 py-3 rounded-[16px] active:opacity-70 disabled:opacity-40")}
                    style={{ color: "#2B2B2B" }}
                  >
                    {a.label}
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

export default PrimaryActionButton;
