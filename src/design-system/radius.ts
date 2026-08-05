/**
 * Minby Design System — Radius
 *
 * Single source of truth for all border radius values.
 */

export const radius = {
  /** Small */
  100: "8px",

  /** Medium */
  200: "16px",

  /** Standard */
  300: "28px",

  /** Fully rounded */
  full: "9999px",

  /** Squircle */
  avatar: "38%",
} as const;

export type RadiusToken = keyof typeof radius;
