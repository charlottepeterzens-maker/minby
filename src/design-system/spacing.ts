/**
 * Minby Design System — Spacing
 * ---------------------------------------
 * Single source of truth for all spacing in Minby.
 *
 * Design principle:
 * If you hesitate between two values — choose the larger one.
 *
 * Never hardcode px values in components.
 * Use these tokens instead.
 */

export const spacing = {
  /**
   * 100 — 4px
   *
   * Used for:
   * • very small gaps
   * • icon ↔ badge
   * • avatar cluster spacing
   */
  100: "4px",

  /**
   * 200 — 8px
   *
   * Used for:
   * • Meta ↔ Heading
   * • related elements
   */
  200: "8px",

  /**
   * 300 — 16px
   *
   * Used for:
   * • card padding
   * • page padding
   * • spacing between components inside cards
   */
  300: "16px",

  /**
   * 400 — 24px
   *
   * Used for:
   * • section spacing
   * • spacing between CircleCards
   * • spacing between larger information blocks
   */
  400: "24px",

  /**
   * 500 — 32px
   *
   * Used for:
   * • large section spacing
   * • Header ↔ first content
   */
  500: "32px",
} as const;

export type SpacingToken = keyof typeof spacing;
