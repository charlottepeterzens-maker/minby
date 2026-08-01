import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typography } from "@/design-system/typography";

type Variant = "primary" | "secondary" | "primaryOnPhoto";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Minby button — text-only with a coloured underline.
 * Typography comes from the design system (`button` variant) — buttons must
 * never define their own font-size or font-weight.
 */
const TextButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className, children, style, ...rest }, ref) => {
    const base = cn(
      typography.button,
      "inline-flex items-center justify-center gap-2 underline underline-offset-2 decoration-1 disabled:opacity-40 disabled:cursor-not-allowed",
    );

    if (variant === "primaryOnPhoto") {
      return (
        <button
          ref={ref}
          {...rest}
          className={cn(
            base,
            "px-4 py-2 rounded-lg backdrop-blur-md",
            className,
          )}
          style={{
            color: "#2B2B2B",
            textDecorationColor: "#C85A2E",
            backgroundColor: "rgba(255,255,255,0.55)",
            ...style,
          }}
        >
          {children}
        </button>
      );
    }

    const decoration = variant === "secondary" ? "#DCEAF8" : "#C85A2E";

    return (
      <button
        ref={ref}
        {...rest}
        className={cn(base, className)}
        style={{ color: "#2B2B2B", textDecorationColor: decoration, ...style }}
      >
        {children}
      </button>
    );
  },
);

TextButton.displayName = "TextButton";

export default TextButton;
