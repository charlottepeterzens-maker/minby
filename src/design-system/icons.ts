/**
 * Minby Design System — Icons
 *
 * Single source of truth for icon tokens.
 */

export const icons = {
  size: {
    100: 16,
    200: 20,
    300: 24,
    400: 32,
  },

  strokeWidth: 2,
} as const;

export type IconSizeToken = keyof typeof icons.size;
