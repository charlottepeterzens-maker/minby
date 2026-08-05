/**
 * Central design tokens for Minby.
 *
 * Radius mirrors the Foundations spec (src/design-system/tokens.ts):
 *   100 = 8px, 200 = 16px, 300 = 28px (standard), full, avatar 38%.
 */

export const RADIUS = {
  /** Content cards, forms and larger surfaces — radius 300 */
  card: 28,

  /** Images and photo tiles — radius 200 */
  photo: 16,

  /** Chat bubbles and smaller surfaces — radius 200 */
  bubble: 16,

  /** Small thumbnails / inputs / badges — radius 100 */
  thumb: 8,

  /** Rounded avatar squircle */
  avatar: "38%",

  /** Bottom sheets — radius 300 */
  sheet: 28,
} as const;

export const RADIUS_CLASS = {
  card: "rounded-[28px]",
  photo: "rounded-[16px]",
  bubble: "rounded-[16px]",
  thumb: "rounded-[8px]",
  avatar: "rounded-[38%]",
  sheet: "rounded-t-[28px]",
} as const;


/**
 * Overlay gradients used on images and hero sections.
 */
export const GRADIENTS = {
  /** Hero headers (circle, profile, chat) */
  hero:
    "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)",

  /** Softer hero overlay */
  subtle:
    "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.35))",

  /** Neutral dark overlay */
  dark:
    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",

  /** Burgundy brand overlay */
  brand:
    "linear-gradient(to top, #561828 0%, rgba(86,24,40,0.35) 55%, rgba(86,24,40,0) 100%)",

  /** Warm ochre overlay */
  warm:
    "linear-gradient(to top, #765D19 0%, rgba(118,93,25,0.35) 55%, rgba(118,93,25,0) 100%)",
} as const;

// Legacy aliases for backwards compatibility
export const CARD_RADIUS = RADIUS;
export const CARD_RADIUS_CLASS = RADIUS_CLASS;
export const OVERLAY_GRADIENT = { ...GRADIENTS, heroSubtle: GRADIENTS.subtle };


