/**
 * Minby Design System — Typography tokens
 * ---------------------------------------
 * Single source of truth for ALL typography in the application.
 *
 * Font family: Outfit — the ONLY font family in Minby.
 *
 * There are exactly SIX canonical text styles:
 *
 *   display  — 24 / 400 / 100%      page titles, profile names, large headings
 *   heading  — 18 / 600 / 110%      section headings, card titles, dialog titles
 *   section  — 18 / 400 / 100%      CircleCard/HangoutCard text, in-card headings,
 *                                   text that leads the user onwards
 *   body     — 14 / 400 / 120%      running text, chat messages, descriptions,
 *                                   summaries, captions, tips
 *   meta     — 10 / 400 / 100% / 2% dates, timestamps, senders, labels
 *   action   — 14 / 600 / 100%      text links, CTAs, TextButtons
 *
 * Underline and color are owned by the component, never by the typography.
 *
 * Never hardcode `text-[..]`, `text-sm`, `font-*`, `leading-*`, `tracking-*`,
 * `fontSize`, `fontWeight`, `lineHeight` or `letterSpacing` in components. Use
 * the <Typography /> component, or — when a native element needs the styles
 * directly (input, textarea, button) — the exported `typography` class map:
 *
 *    <input className={cn(typography.body, "...")} />
 *
 * If a new typographic need appears, add it to THIS file first. Never create a
 * local solution.
 */

/** The six canonical text styles. */
export type CanonicalVariant =
  | "display"
  | "heading"
  | "section"
  | "body"
  | "meta"
  | "action"
  /** Brand wordmark ("minby") — logo lockup only. */
  | "wordmark";

/**
 * Deprecated aliases kept so older call sites keep compiling.
 * They resolve to one of the canonical styles — do not use in new code.
 */
export type LegacyVariant =
  | "title"
  | "bodyMd"
  | "bodySm"
  | "caption"
  | "label"
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
  letterSpacing: string;
  /** Default HTML element when no `as` prop is given */
  element: keyof JSX.IntrinsicElements;
  /** Tailwind class string generated from the values above */
  className: string;
};

export const typographyTokens: Record<CanonicalVariant, TypographyToken> = {
  display: {
    description: "Page titles, profile names, large headings — 24 / Regular / 100%",
    fontSize: "24px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0",
    element: "h1",
    className: "text-[24px] font-normal leading-[1] tracking-[0]",
  },
  heading: {
    description: "Section headings, card titles, dialog titles — 18 / Semibold / 110%",
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: "110%",
    letterSpacing: "0",
    element: "h2",
    className: "text-[18px] font-semibold leading-[1.1] tracking-[0]",
  },
  section: {
    description: "CircleCard/HangoutCard text, in-card headings, leading text — 18 / Regular / 100%",
    fontSize: "18px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0",
    element: "p",
    className: "text-[18px] font-normal leading-[1] tracking-[0]",
  },
  body: {
    description: "All running text, chat, descriptions, tips, inputs — 14 / Regular / 120%",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "120%",
    letterSpacing: "0",
    element: "p",
    className: "text-[14px] font-normal leading-[1.2] tracking-[0]",
  },
  meta: {
    description: "Dates, timestamps, senders, labels, small info rows — 10 / Regular / 100% / 2%",
    fontSize: "10px",
    fontWeight: 400,
    lineHeight: "100%",
    letterSpacing: "0.02em",
    element: "p",
    className: "text-[10px] font-normal leading-[1] tracking-[0.02em]",
  },
  action: {
    description: "Text links, CTAs and TextButtons — 14 / Semibold / 100%",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "100%",
    letterSpacing: "0",
    element: "span",
    className: "text-[14px] font-semibold leading-[1] tracking-[0]",
  },
  wordmark: {
    description: "Brand wordmark 'minby' — logo lockup only",
    fontSize: "26px",
    fontWeight: 300,
    lineHeight: "100%",
    letterSpacing: "-0.02em",
    element: "span",
    className: "text-[26px] font-light leading-[1] tracking-[-0.02em] lowercase",
  },
};

/** Deprecated variant -> canonical style. */
export const legacyVariantMap: Record<LegacyVariant, CanonicalVariant> = {
  title: "heading",
  bodyMd: "body",
  bodySm: "body",
  caption: "meta",
  label: "meta",
  labelSm: "meta",
  eyebrow: "meta",
  button: "action",
};

export const resolveVariant = (variant: TypographyVariant): CanonicalVariant =>
  (legacyVariantMap as Record<string, CanonicalVariant>)[variant] ??
  (variant as CanonicalVariant);

/** Class-map shortcut: `typography.body`, `typography.action`, … */
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
