import { cn } from "@/lib/utils";
import React from "react";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("max-w-md mx-auto px-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);
Container.displayName = "Container";

export default Container;
