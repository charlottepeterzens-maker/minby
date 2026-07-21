/**
 * Central design tokens for card corner radii and overlay/gradient effects.
 * Use these instead of inlining rounded-[Npx] or linear-gradient strings so
 * the visual language stays consistent across pages and components.
 */

export const CARD_RADIUS = {
  /** Content cards: circle, meeting, tip, placeholder, sheet forms. */
  card: 28,
  /** Photo tiles, hero images inside sheets. */
  photo: 24,
  /** Chat bubbles, composer, small info surfaces. */
  bubble: 20,
  /** Small inline media thumbnails. */
  thumb: 16,
  /** Squircle for avatars. */
  avatar: "32%",
} as const;

export const CARD_RADIUS_CLASS = {
  card: "rounded-[28px]",
  photo: "rounded-[24px]",
  bubble: "rounded-[20px]",
  thumb: "rounded-[16px]",
  avatar: "rounded-[32%]",
} as const;

/** Gradients used to overlay text on top of photos/heros. */
export const OVERLAY_GRADIENT = {
  /** Hero header (circle page, chat) — dark to transparent, bottom-up. */
  hero: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
  /** Subtle top-to-bottom darkening for hero backgrounds. */
  heroSubtle: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.35))",
  /** Neutral overlay used on photo tiles. */
  dark: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",
  /** Burgundy overlay used on tip tiles. */
  tips: "linear-gradient(to top, #561828 0%, rgba(86,24,40,0.35) 55%, rgba(86,24,40,0) 100%)",
  /** Ochre overlay used on photo tiles inside profile/circle photo strips. */
  photos: "linear-gradient(to top, #765D19 0%, rgba(118,93,25,0.35) 55%, rgba(118,93,25,0) 100%)",
} as const;
