import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Typography } from "@/components/ui/typography";

export interface MyMenuItem {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  items: MyMenuItem[];
}

/**
 * My Menu — the user's own space. Holds no business logic; every item is
 * supplied by the caller.
 */
const MyMenu = ({ open, onOpenChange, title = "Mitt", items }: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <BottomSheetContent>
      <BottomSheetHeader title={title} />
      <BottomSheetBody className="px-300 pt-300 pb-500">
        <ul className="space-y-100">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(item.onSelect, 200);
                }}
                className="w-full text-left min-h-11 py-200 px-300 rounded-200"
              >
                <Typography as="span" variant="body" className="block text-foreground">
                  {item.label}
                </Typography>
                {item.description && (
                  <Typography
                    as="span"
                    variant="meta"
                    className="block mt-1"
                    style={{ color: "hsl(var(--color-text-tertiary))" }}
                  >
                    {item.description}
                  </Typography>
                )}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheetBody>
    </BottomSheetContent>
  </Sheet>
);

export default MyMenu;
