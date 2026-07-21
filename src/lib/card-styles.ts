/**
 * Central design tokens for Minby.
 *
 * Keep all corner radii and overlay gradients here to ensure a
 * consistent visual language throughout the app.
 */

export const RADIUS = {
  /** Content cards, forms and larger surfaces */
  card: 28,

  /** Images and photo tiles */
  photo: 24,

  /** Chat bubbles and smaller surfaces */
  bubble: 20,

  /** Small thumbnails */
  thumb: 16,

  /** Rounded avatar squircle */
  avatar: "32%",

  /** Bottom sheets */
  sheet: 28,
} as const;

export const RADIUS_CLASS = {
  card: "rounded-[28px]",
  photo: "rounded-[24px]",
  bubble: "rounded-[20px]",
  thumb: "rounded-[16px]",
  avatar: "rounded-[32%]",
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
