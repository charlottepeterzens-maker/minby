/**
 * Minby Design System — Typography tokens
 * ---------------------------------------
 * Single source of truth for ALL typography in the application.
 *
 * There are exactly FIVE canonical variants:
 *
 *   display  — page titles
 *   heading  — section / card / sheet headings
 *   body     — all running text, inputs, buttons
 *   meta     — metadata, hints, helper text, eyebrows
 *   label    — field labels, nav labels, author names
 *
 * Never hardcode `text-[..]`, `font-*`, `leading-*`, `fontSize` or
 * `fontWeight` in components. Use the <Typography /> component, or — when a
 * native element needs the styles directly (input, textarea, button) — the
 * exported `typography` class map:
 *
 *    <input className={cn(typography.body, "...")} />
 *
 * If a new typographic need appears, extend THIS file. Never create a local
 * solution.
 */

/** The five canonical variants. */
export type CanonicalVariant = "display" | "heading" | "body" | "meta" | "label";

/**
 * Deprecated aliases kept so older call sites keep compiling.
 * They resolve to one of the five canonical variants — do not use in new code.
 */
export type LegacyVariant =
  | "title"
  | "bodyMd"
  | "bodySm"
  | "caption"
  | "labelSm"
  | "eyebrow"
  | "button";

export type TypographyVariant = CanonicalVariant | LegacyVariant;

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

export const typographyTokens: Record<CanonicalVariant, TypographyToken> = {
  display: {
    description: "Page and hero titles — 28px / Medium / tight",
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
  body: {
    description: "All running text, inputs, textareas and buttons — 16px / Regular",
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: "1.5",
    element: "p",
    className: "text-[1rem] font-normal leading-[1.5]",
  },
  meta: {
    description: "Metadata, eyebrows, hints, helper and validation text — 12px / Regular",
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
};

/** Deprecated variant -> canonical variant. */
export const legacyVariantMap: Record<LegacyVariant, CanonicalVariant> = {
  title: "heading",
  bodyMd: "body",
  bodySm: "body",
  caption: "meta",
  labelSm: "label",
  eyebrow: "meta",
  button: "body",
};

export const resolveVariant = (variant: TypographyVariant): CanonicalVariant =>
  (legacyVariantMap as Record<string, CanonicalVariant>)[variant] ??
  (variant as CanonicalVariant);

/** Class-map shortcut: `typography.body`, `typography.label`, … */
export const typography = Object.fromEntries(
  ([
    ...Object.keys(typographyTokens),
    ...Object.keys(legacyVariantMap),
  ] as TypographyVariant[]).map((key) => [
    key,
    typographyTokens[resolveVariant(key)].className,
  ]),
) as Record<TypographyVariant, string>;

/** Default element per variant, used by the <Typography /> component. */
export const typographyElements = Object.fromEntries(
  ([
    ...Object.keys(typographyTokens),
    ...Object.keys(legacyVariantMap),
  ] as TypographyVariant[]).map((key) => [
    key,
    typographyTokens[resolveVariant(key)].element,
  ]),
) as Record<TypographyVariant, keyof JSX.IntrinsicElements>;

/** The one and only font family in Minby. */
export const fontFamily = "Outfit, sans-serif";
