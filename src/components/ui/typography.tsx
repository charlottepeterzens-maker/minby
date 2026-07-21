import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TypographyProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Large page titles
 * Example: "Familjen", "Min profil"
 */
export function Display({ children, className }: TypographyProps) {
  return (
    <h1
      className={cn(
        "text-[28px] font-medium leading-[110%] text-[#2B2B2B]",
        className
      )}
    >
      {children}
    </h1>
  );
}

/**
 * Section and sheet headings
 * Example: "Skridskor", "Tips", "Inställningar"
 */
export function Heading({ children, className }: TypographyProps) {
  return (
    <h2
      className={cn(
        "text-[18px] font-semibold leading-[125%] text-[#2B2B2B]",
        className
      )}
    >
      {children}
    </h2>
  );
}

/**
 * Standard body text
 */
export function Body({ children, className }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[15px] font-normal leading-[150%] text-[#2B2B2B]",
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * Small supporting body text
 */
export function Caption({ children, className }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[12px] font-normal leading-[150%] text-[#675332]",
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * Metadata
 * Example: "Chaluda · 16 juli 2026"
 */
export function Meta({ children, className }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[13px] font-normal leading-[140%] text-[#675332]",
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * Small labels
 * Example: "Med på träffen", "Deltagare", "Plats"
 *
 * Never use uppercase.
 */
export function Label({ children, className }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium leading-[140%] tracking-[0.02em] text-[#675332]",
        className
      )}
    >
      {children}
    </p>
  );
}
