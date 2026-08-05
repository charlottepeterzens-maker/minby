/**
 * Minby Design System — Typography
 * --------------------------------
 * Single source of truth for typography.
 *
 * Font family:
 * Outfit
 *
 * Canonical text styles:
 *
 * Display
 * Heading
 * Section
 * Body
 * Meta
 * Action
 *
 * Never hardcode font size, weight, line height or letter spacing in components.
 */

export type TypographyVariant =
  | "display"
  | "heading"
  | "section"
  | "body"
  | "meta"
  | "action";

export type TypographyStyle = {
  description: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing: string;
  element: keyof JSX.IntrinsicElements;
  className: string;
};

export const typography = {
  display: {
    description: "Page titles and profile names",
    fontSize: "24px",
    fontWeight: 500,
    lineHeight: "100%",
    letterSpacing: "0",
    element: "h1",
    className: "text-display",
  },

  heading: {
    description: "Section headings and card titles",
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: "110%",
    letterSpacing: "0",
    element: "h2",
    className: "text-heading",
  },

  section: {
    description: "Leading text inside cards",
    fontSize: "18px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0",
    element: "p",
    className: "text-section",
  },

  body: {
    description: "Body text, descriptions, chat messages and summaries",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "120%",
    letterSpacing: "0",
    element: "p",
    className: "text-body",
  },

  meta: {
    description: "Dates, labels, timestamps and metadata",
    fontSize: "10px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0.02em",
    element: "span",
    className: "text-meta",
  },

  action: {
    description: "Links, CTA:s and TextButtons",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "100%",
    letterSpacing: "0",
    element: "button",
    className: "text-action",
  },
} satisfies Record<TypographyVariant, TypographyStyle>;

export const fontFamily = "Outfit, sans-serif";
