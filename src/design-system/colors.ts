/**
 * Minby Design System — Colors
 *
 * Single source of truth for all color tokens.
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
    primary: "#2B2928",
    inverse: "#FFFFFF",
  },

  activity: "#C4522A",
} as const;

export type ColorToken = typeof colors;
