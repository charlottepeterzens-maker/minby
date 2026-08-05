/**
 * Minby Design System — Typography
 *
 * Single source of truth for all typography.
 *
 * `typography` maps every variant to a Tailwind class string (the only way
 * type should be applied in components). `typographyTokens` holds the raw
 * values that the CSS utilities in src/index.css mirror.
 */

export type TypographyVariant =
  | "display"
  | "heading"
  | "section"
  | "body"
  | "meta"
  | "action";

export type TypographyStyle = {
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing: string;
};

/** Raw token values — mirrored by the .text-* utilities in src/index.css */
export const typographyTokens = {
  display: {
    fontSize: "24px",
    fontWeight: 500,
    lineHeight: "100%",
    letterSpacing: "0",
  },
  heading: {
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: "110%",
    letterSpacing: "0",
  },
  section: {
    fontSize: "18px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0",
  },
  body: {
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "120%",
    letterSpacing: "0",
  },
  meta: {
    fontSize: "10px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0.02em",
  },
  action: {
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "100%",
    letterSpacing: "0",
  },
} satisfies Record<TypographyVariant, TypographyStyle>;

/** Class map — the only way typography should be applied in components. */
export const typography: Record<TypographyVariant, string> = {
  display: "font-display text-display",
  heading: "font-display text-heading",
  section: "font-display text-section",
  body: "font-body text-body",
  meta: "font-body text-meta",
  action: "font-body text-action",
};

/** Default HTML element per variant */
export const typographyElements: Record<TypographyVariant, string> = {
  display: "h1",
  heading: "h2",
  section: "h3",
  body: "p",
  meta: "span",
  action: "span",
};
