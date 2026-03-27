import { cn } from "@/lib/utils";
import React from "react";

interface PageCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PageCard = React.forwardRef<HTMLDivElement, PageCardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-xl p-4 shadow-[0_1px_4px_0_hsl(0_0%_0%/0.05)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PageCard.displayName = "PageCard";

export default PageCard;
