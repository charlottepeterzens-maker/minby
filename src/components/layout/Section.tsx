import { cn } from "@/lib/utils";
import React from "react";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Use 'div' instead of 'section' when semantically appropriate */
  as?: "section" | "div";
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, children, as: Tag = "section", ...props }, ref) => (
    <Tag
      ref={ref as any}
      className={cn("mt-4", className)}
      {...props}
    >
      {children}
    </Tag>
  )
);
Section.displayName = "Section";

export default Section;
