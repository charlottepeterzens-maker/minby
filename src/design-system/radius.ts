/**
 * Minby Design System — Radius
 *
 * Single source of truth for all radius tokens.
 */

export const radius = {
  100: "8px",
  200: "16px",
  300: "28px",

  full: "9999px",
  avatar: "38%",
} as const;

export type RadiusToken = keyof typeof radius;
