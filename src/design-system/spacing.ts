/**
 * Minby Design System — Spacing
 *
 * Single source of truth for all spacing values.
 */

export const spacing = {
  100: "4px",
  200: "8px",
  300: "16px",
  400: "24px",
  500: "32px",
} as const;

export type SpacingToken = keyof typeof spacing;
