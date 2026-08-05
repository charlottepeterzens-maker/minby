/**
 * ============================================================================
 * Minby Design System — Colors
 * ============================================================================
 *
 * Single source of truth for all brand colours in Minby.
 *
 * Naming convention
 * -----------------
 * Butter   = Circle / warm surfaces
 * Breeze   = Posts / cool surfaces
 * Berry    = Brand colour family
 * Olive    = Tips / recommendation surfaces
 * Neutrals = App background & UI surfaces
 * Text     = Typography
 * Activity = Notifications & new activity
 *
 * Rules
 * -----
 * • Never hardcode HEX values inside components.
 * • Always reference colours from this file.
 * • Component usage belongs in component tokens, not here.
 * ============================================================================
 */

export const colors = {
  butter: {
    100: "#F9F3E1",
    200: "#FDEEC0",
    300: "#F9E29D",
  },

  breeze: {
    100: "#DAEAF6",
    200: "#9CBBD3",
    300: "#55778F",
  },

  berry: {
    100: "#FAE6DC",
    200: "#A4413B",
    300: "#732F28",
  },

  olive: {
    100: "#E4E2C8",
    200: "#BEB87B",
    300: "#66632F",
  },

  neutral: {
    white: "#FFFFFF",
    egg: "#FCFBF8",
    linen: "#F2ECE3",
  },

  text: {
    ink: "#2B2928",
    inverse: "#FFFFFF",
  },

  activity: "#C4522A",
} as const;

export type ColorPalette = typeof colors;
