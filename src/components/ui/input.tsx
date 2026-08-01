import * as React from "react";

import { cn } from "@/lib/utils";
import { typography } from "@/design-system/typography";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          typography.body,
          "flex h-10 w-full rounded-md border-0 bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]",
          className,
        )}

        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
