/**
 * Minby Design System — Typography
 *
 * Single source of truth for all typography tokens.
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

export const typography = {
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
