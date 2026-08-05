/**
 * Minby Design System — Layout
 * ---------------------------------------
 * Defines the structural layout rules used throughout Minby.
 *
 * These values are built on top of the spacing tokens.
 *
 * Never hardcode layout values inside components.
 * Import them from this file instead.
 */

import { spacing } from "./spacing";

export const layout = {
  /**
   * Maximum width of the app content.
   */
  pageMaxWidth: "448px",

  /**
   * Horizontal padding on every page.
   */
  pagePadding: spacing[300],

  /**
   * Vertical spacing between sections.
   */
  sectionSpacing: spacing[400],

  /**
   * Default internal padding inside cards.
   *
   * Cards may use between 16–20 px depending on the component,
   * but 16 px is the system default.
   */
  cardPadding: spacing[300],

  /**
   * Default spacing between components.
   */
  componentSpacing: spacing[400],

  /**
   * Internal padding inside BottomSheets.
   */
  bottomSheetPadding: spacing[400],

  /**
   * Default spacing between avatars in avatar clusters.
   */
  avatarSpacing: spacing[200],

  /**
   * Floating Action Button position.
   */
  fab: {
    right: spacing[400],
    bottom: spacing[400],
  },
} as const;

/**
 * Standard vertical rhythm inside cards and information blocks.
 *
 * Meta
 * ↓ 8 px
 * Section
 * ↓ 16 px
 * Body
 * ↓ 16 px
 * Action
 */
export const contentRhythm = {
  metaToSection: spacing[200],

  sectionToBody: spacing[300],

  bodyToAction: spacing[300],
} as const;
