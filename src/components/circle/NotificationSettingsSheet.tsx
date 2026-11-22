import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Typography } from "@/components/ui/typography";
import { isStandalonePwa } from "@/lib/push";

type NotifyLevel = "all" | "important" | "silent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleName: string;
  level: NotifyLevel;
  onSelect: (level: NotifyLevel) => void;
}

const OPTIONS: { value: NotifyLevel; label: string }[] = [
  { value: "all", label: "Alla meddelanden" },
  { value: "important", label: "Bara träffar och när någon nämner mig" },
  { value: "silent", label: "Tyst" },
];

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

const NotificationSettingsSheet = ({ open, onOpenChange, circleName, level, onSelect }: Props) => {
  const showInstallHint = isIOS && !isStandalonePwa();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader title={`Notiser från ${circleName}`} />
        <BottomSheetBody className="px-300 pt-200 pb-500 space-y-200">
          {OPTIONS.map((opt) => {
            const selected = level === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className="w-full text-left rounded-200 px-300 py-3 transition-colors"
                style={{
                  backgroundColor: selected ? "hsl(44, 65%, 93%)" : "transparent",
                }}
              >
                <Typography
                  variant="body"
                  as="span"
                  style={{ color: selected ? "hsl(44, 65%, 28%)" : "hsl(var(--color-text-primary))", fontWeight: selected ? 500 : 400 }}
                >
                  {opt.label}
                </Typography>
              </button>
            );
          })}
          {showInstallHint && (
            <Typography variant="meta" as="p" className="pt-200 px-100" style={{ color: "hsl(var(--color-text-tertiary))" }}>
              Lägg till Minby på hemskärmen (Dela → Lägg till på hemskärmen) för att få pushnotiser på iPhone.
            </Typography>
          )}
        </BottomSheetBody>
      </BottomSheetContent>
    </Sheet>
  );
};

export default NotificationSettingsSheet;
