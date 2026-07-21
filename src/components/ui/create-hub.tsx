import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";

export interface CreateHubAction {
  label: string;
  onSelect: () => void;
  /** If true, the hub sheet stays open (used to layer another sheet on top). */
  keepOpen?: boolean;
}

export interface CreateHubSection {
  title: string;
  actions: CreateHubAction[];
}

interface Props {
  /** Grouped actions (preferred). */
  sections?: CreateHubSection[];
  /** Flat action list (legacy). */
  actions?: CreateHubAction[];
  title?: string;
  ariaLabel?: string;
}

/**
 * Minby Create Hub — the single floating "+" per view.
 * Opens a bottom sheet acting as an action menu for the current context
 * (e.g. the current Circle). Actions can be grouped into sections.
 */
const CreateHub = ({
  sections,
  actions,
  title = "Vad vill du göra?",
  ariaLabel = "Öppna åtgärder",
}: Props) => {
  const [open, setOpen] = useState(false);

  const resolvedSections: CreateHubSection[] =
    sections ?? (actions ? [{ title: "", actions }] : []);

  const handleSelect = (a: CreateHubAction) => {
    if (!a.keepOpen) setOpen(false);
    // let the sheet close before opening a follow-up sheet
    setTimeout(a.onSelect, a.keepOpen ? 0 : 200);
  };

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
        <BottomSheetContent>
          <BottomSheetHeader title={title} />
          <BottomSheetBody className="px-2 pt-4 pb-8">
            {resolvedSections.map((section, si) => (
              <div key={si} className={si === 0 ? "" : "mt-8"}>
                {section.title && (
                  <div
                    className="px-3 pt-3 pb-2 text-eyebrow uppercase"
                    style={{ color: "#675332" }}
                  >
                    {section.title}
                  </div>
                )}
                <ul className="space-y-1">
                  {section.actions.map((a, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => handleSelect(a)}
                        className="w-full text-left text-body px-3 py-3 rounded-[16px] active:opacity-70"
                        style={{ color: "#2B2B2B" }}
                      >
                        {a.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </BottomSheetBody>
        </BottomSheetContent>
      </Sheet>
    </>
  );
};

export default CreateHub;
