import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { SheetOverlay, SheetPortal, SheetTitle } from "@/components/ui/sheet";

/**
 * Standardized Minby Bottom Sheet.
 *
 * Every bottom sheet in the application uses this component so that
 * radius, header layout, close button, divider, spacing and animation
 * remain identical across the app.
 *
 * Usage:
 *   <Sheet open={...} onOpenChange={...}>
 *     <BottomSheetContent>
 *       <BottomSheetHeader title="Titel" />
 *       <BottomSheetBody className="px-5 py-4">…</BottomSheetBody>
 *       <BottomSheetFooter>…</BottomSheetFooter>  // optional
 *     </BottomSheetContent>
 *   </Sheet>
 */

interface BottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  /** Viewport height percentage. Default 85. Small confirmation dialogs may use less. */
  height?: number;
}

export const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  BottomSheetContentProps
>(({ className, children, height = 85, style, onOpenAutoFocus, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        onOpenAutoFocus?.(e);
      }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex flex-col border-0 shadow-lg outline-none",
        "rounded-t-[28px] overflow-hidden",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "data-[state=closed]:duration-300 data-[state=open]:duration-500",
        className,
      )}
      style={{
        height: `${height}dvh`,
        maxHeight: `calc(100dvh - var(--keyboard-inset, 0px))`,
        backgroundColor: "hsl(var(--background))",
        ...style,
      }}
      {...props}
    >
      {/* Drag handle */}
      <div className="shrink-0 flex justify-center pt-2 pb-1">
        <div
          className="rounded-full"
          style={{
            width: 32,
            height: 4,
            backgroundColor: "hsl(var(--color-border-subtle))",
          }}
        />
      </div>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
BottomSheetContent.displayName = "BottomSheetContent";

interface BottomSheetHeaderProps {
  title: React.ReactNode;
  className?: string;
}

export const BottomSheetHeader = ({ title, className }: BottomSheetHeaderProps) => (
  <div
    className={cn(
      "shrink-0 sticky top-0 z-20 flex items-center justify-center",
      "px-14 h-14 border-b",
      className,
    )}
    style={{
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--color-border-subtle))",
    }}
  >
    <SheetTitle
      className="text-heading-md text-center truncate"
      style={{ color: "#2B2B2B" }}
    >
      {title}
    </SheetTitle>
    <SheetPrimitive.Close
      aria-label="Stäng"
      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full active:opacity-70 focus:outline-none"
    >
      <X className="w-5 h-5" style={{ color: "#2B2B2B" }} />
    </SheetPrimitive.Close>
  </div>
);

export const BottomSheetBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto overscroll-contain", className)}
    {...props}
  />
));
BottomSheetBody.displayName = "BottomSheetBody";

export const BottomSheetFooter = ({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("shrink-0 sticky bottom-0 z-10 px-5 pt-3 border-t", className)}
    style={{
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--color-border-subtle))",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      ...style,
    }}
    {...props}
  />
);
