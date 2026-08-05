/**
 * Minby Design System — Foundations
 * ---------------------------------
 * Source: "01. Foundations" (design spec).
 *
 * Design principles for foundations:
 *   Less, but clearer.
 *   Relationer före innehåll. Människor före funktioner.
 *   Kontext före handling. Lugn före dopamin. Kvalitet före kvantitet.
 *   Förutsägbarhet före överraskning.
 *   Använd text före ikoner. Använd spacing före borders. Använd färg före skuggor.
 *   Ta bort innan du lägger till.
 *
 * Never hardcode px values in components — use these tokens (or their
 * Tailwind equivalents: `p-300`, `gap-200`, `rounded-300`, `duration-fast`, …).
 */

/* ------------------------------------------------------------------ *
 * Spacing — "Om du tvekar mellan två värden, välj det större."
 * ------------------------------------------------------------------ */
export const spacing = {
  /** 4px — mikroavstånd: ikon/badge, avatar-kluster */
  100: "4px",
  /** 8px — relaterade element: Meta ↔ rubrik */
  200: "8px",
  /** 16px — intern komponentlayout: kortpadding, sidmarginal */
  300: "16px",
  /** 24px — mellan komponenter: sektioner, CircleCards */
  400: "24px",
  /** 32px — mellan stora sektioner: header ↔ första innehållet */
  500: "32px",
} as const;

export const layout = {
  /** Max bredd på innehållskolumnen */
  pageMaxWidth: "448px",
  pagePadding: spacing[300],
  sectionSpacing: spacing[400],
  /** Card padding: 16–20px */
  cardPadding: spacing[300],
  componentSpacing: spacing[400],
  bottomSheetPadding: spacing[400],
  avatarSpacing: spacing[200],
  /** FAB: 24px från nederkant och höger */
  fabOffset: spacing[400],
} as const;

/** Content rhythm: Meta ↓8 · Section ↓16 · Body ↓16 · Action */
export const contentRhythm = {
  metaToSection: spacing[200],
  sectionToBody: spacing[300],
  bodyToAction: spacing[300],
} as const;

/* ------------------------------------------------------------------ *
 * Radius
 * ------------------------------------------------------------------ */
export const radius = {
  /** 8px — inputs, badges */
  100: "8px",
  /** 16px — små kort, bilder */
  200: "16px",
  /** 28px — standard: CircleCard, BottomSheet, TipCard */
  300: "28px",
  /** Pills */
  full: "9999px",
  /** Profilbilder */
  avatar: "38%",
} as const;

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ *
 * Motion förklarar förändringar — aldrig dekoration.
 * Undvik: bounce, oändliga eller pulserande animationer, glöd/blink,
 * animationer som fördröjer interaktion.
 */
export const duration = {
  /** 120ms — tryck, hover, mindre tillstånd */
  fast: "120ms",
  /** 220ms — default för de flesta övergångar */
  default: "220ms",
  /** 320ms — bottom sheets, menyer, större övergångar */
  slow: "320ms",
} as const;

export const easing = {
  /** Standard för hela appen */
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  /** Emphasized — bottom sheets och större övergångar */
  emphasized: "cubic-bezier(0.2, 0, 0, 1.2)",
} as const;

/** Händelse → animation */
export const motionPatterns = {
  bottomSheetOpen: "slide-up + fade-in",
  bottomSheetClose: "slide-down + fade-out",
  newContent: "fade-in",
  circleCards: "staggered fade-in",
  expandSection: "height + fade",
  fabPress: "lätt scale",
  menuOpen: "slide + fade",
} as const;

/** Haptics: primär handling = light, fel = medium, navigation = ingen. */
export const haptics = {
  primaryAction: 10,
  error: 20,
  navigation: 0,
} as const;

/**
 * Loading: när layouten är känd används alltid Skeletons.
 * Spinners endast när innehållets struktur inte kan förutses.
 */
export const loading = {
  preferred: "skeleton",
  fallback: "spinner",
} as const;

/* ------------------------------------------------------------------ *
 * Icons — Lucide är enda ikonbiblioteket
 * ------------------------------------------------------------------ *
 * Ikoner stödjer förståelsen, aldrig dekoration. Texten bär alltid den
 * primära betydelsen. Ikonen placeras före texten med 8px avstånd.
 * Standard-stroke alltid; färg alltid via design tokens.
 */
export const iconSize = {
  /** 16px — inline, metadata */
  small: 16,
  /** 20px — standard i appen */
  default: 20,
  /** 24px — navigation, menyer, CTA */
  large: 24,
  /** 32px — empty states vid behov */
  xl: 32,
} as const;

/** Rekommenderade Lucide-ikoner per funktion. */
export const iconMap = {
  meny: "Menu",
  tillbaka: "ArrowLeft",
  skapa: "Plus",
  sok: "Search",
  filter: "SlidersHorizontal",
  kalender: "Calendar",
  foto: "Image",
  kamera: "Camera",
  plats: "MapPin",
  dela: "Share",
  installningar: "Settings",
  aviseringar: "Bell",
  chat: "MessageCircle",
  tips: "Lightbulb",
  krets: "Users",
} as const;

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type IconSizeToken = keyof typeof iconSize;
