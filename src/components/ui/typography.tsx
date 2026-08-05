import { createElement, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  typography,
  typographyElements,
  type TypographyVariant,
} from "@/design-system/typography";

export type { TypographyVariant };
export { typography, typographyTokens } from "@/design-system/typography";

interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "color"> {
  variant?: TypographyVariant;
  /** Override the rendered HTML element (semantics / layout) */
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * The only way typography should be applied in Minby.
 *
 *   <Typography variant="display">Välkommen</Typography>
 *   <Typography variant="heading" as="h3">Kretsen</Typography>
 *   <Typography variant="meta">2 timmar sedan</Typography>
 */
export const Typography = ({
  variant = "body",
  as,
  className,
  children,
  ...rest
}: TypographyProps) => {
  const Element = (as ?? typographyElements[variant]) as ElementType;
  return createElement(
    Element,
    { className: cn(typography[variant], className), ...rest },
    children,
  );
};

/* ------------------------------------------------------------------ */
/* Convenience wrappers — thin aliases over the same tokens            */
/* ------------------------------------------------------------------ */

type AliasProps = Omit<TypographyProps, "variant">;

export const Display = (p: AliasProps) => <Typography variant="display" {...p} />;
export const Heading = (p: AliasProps) => <Typography variant="heading" {...p} />;
export const Section = (p: AliasProps) => <Typography variant="section" {...p} />;
export const Body = (p: AliasProps) => <Typography variant="body" {...p} />;
export const Meta = (p: AliasProps) => <Typography variant="meta" {...p} />;
export const Action = (p: AliasProps) => <Typography variant="action" {...p} />;

export default Typography;
