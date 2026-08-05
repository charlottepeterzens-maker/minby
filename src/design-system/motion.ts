/**
 * Minby Design System — Motion
 *
 * Single source of truth for all motion tokens.
 */

export const duration = {
  fast: "120ms",
  default: "220ms",
  slow: "320ms",
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1.2)",
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
