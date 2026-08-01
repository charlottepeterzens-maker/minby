/**
 * Minby Design System — Typography tokens
 * ---------------------------------------
 * Single source of truth for ALL typography in the application.
 *
 * Never hardcode `text-[..]`, `font-*` or `leading-*` in components.
 * Use the <Typography /> component, or — when a native element needs the
 * styles directly (button, input, textarea, placeholder) — the exported
 * `typography` class map:
 *
 *    <input className={cn(typography.body, "...")} />
 *
 * This file is the template for the rest of the design system
 * (colors.ts, spacing.ts, radius.ts, shadows.ts) — same shape:
 * semantic token -> value -> tailwind class string.
 */

export type TypographyVariant =
  | "display"
  | "heading"
  | "title"
  | "body"
  | "bodyMd"
  | "bodySm"
  | "meta"
  | "caption"
  | "label"
  | "labelSm"
  | "eyebrow"
  | "button";

type TypographyToken = {
  /** Semantic purpose of the token */
  description: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing?: string;
  /** Default HTML element when no `as` prop is given */
  element: keyof JSX.IntrinsicElements;
  /** Tailwind class string generated from the values above */
  className: string;
};

export const typographyTokens: Record<TypographyVariant, TypographyToken> = {
  display: {
    description: "Page titles — 28px / Medium / tight",
    fontSize: "1.75rem",
    fontWeight: 500,
    lineHeight: "1.1",
    element: "h1",
    className: "text-[1.75rem] font-medium leading-[1.1]",
  },
  heading: {
    description: "Section, card and sheet headings — 18px / SemiBold",
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: "1.25",
    element: "h2",
    className: "text-[1.125rem] font-semibold leading-[1.25]",
  },
  title: {
    description: "Compact card titles — 16px / Medium",
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: "1.2",
    element: "h3",
    className: "text-[1rem] font-medium leading-[1.2]",
  },
  body: {
    description: "Standard body copy, inputs and textareas — 16px / Regular",
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: "1.5",
    element: "p",
    className: "text-[1rem] font-normal leading-[1.5]",
  },
  bodySm: {
    description: "Dense body copy inside compact cards — 14px / Regular",
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: "1.4",
    element: "p",
    className: "text-[0.875rem] font-normal leading-[1.4]",
  },
  meta: {
    description: "Metadata, hints, helper and validation text — 12px / Regular",
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: "1.4",
    element: "p",
    className: "text-[0.75rem] font-normal leading-[1.4]",
  },
  label: {
    description: "Field labels, navigation labels, author names — 12px / Medium",
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: "1.4",
    element: "span",
    className: "text-[0.75rem] font-medium leading-[1.4]",
  },
  eyebrow: {
    description: "Small overline labels above a heading — 10px / Regular",
    fontSize: "0.625rem",
    fontWeight: 400,
    lineHeight: "1",
    letterSpacing: "0.02em",
    element: "span",
    className: "text-[0.625rem] font-normal leading-none tracking-[0.02em]",
  },
  button: {
    description: "All buttons and text buttons — 16px / Medium",
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: "1",
    element: "span",
    className: "text-[1rem] font-medium leading-none",
  },
};

/** Class-map shortcut: `typography.body`, `typography.label`, … */
export const typography = Object.fromEntries(
  Object.entries(typographyTokens).map(([key, token]) => [key, token.className]),
) as Record<TypographyVariant, string>;

/** Default element per variant, used by the <Typography /> component. */
export const typographyElements = Object.fromEntries(
  Object.entries(typographyTokens).map(([key, token]) => [key, token.element]),
) as Record<TypographyVariant, keyof JSX.IntrinsicElements>;

/** The one and only font family in Minby. */
export const fontFamily = "Outfit, sans-serif";
