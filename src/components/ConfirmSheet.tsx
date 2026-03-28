import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmStyle?: React.CSSProperties;
  onConfirm: () => void;
}

const ConfirmSheet = ({ open, onOpenChange, title, description, confirmLabel = "Ta bort", confirmStyle, onConfirm }: Props) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="mx-auto max-w-lg border-0" style={{ backgroundColor: "#F7F3EF", borderRadius: "20px 20px 0 0" }}>
      <DrawerHeader className="pb-2">
        <DrawerTitle className="font-display text-[16px] font-medium text-center" style={{ color: "#3C2A4D" }}>
          {title}
        </DrawerTitle>
      </DrawerHeader>
      <div className="px-5 pb-6 space-y-4">
        <p className="text-[13px] text-center" style={{ color: "#655675" }}>{description}</p>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px]"
            style={{ color: "#3C2A4D", backgroundColor: "#F0ECE7" }}
          >
            Avbryt
          </button>
          <button
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={confirmStyle || { backgroundColor: "#3C2A4D" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </DrawerContent>
  </Drawer>
);

export default ConfirmSheet;
