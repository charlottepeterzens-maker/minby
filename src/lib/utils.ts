import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Minby's typography scale (text-display/heading/section/body/meta/action)
 * must be registered as font-size classes, otherwise tailwind-merge treats
 * them as text colors and silently drops them when a color class is present.
 */
const TYPOGRAPHY_SIZES = ["display", "heading", "section", "body", "meta", "action"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPOGRAPHY_SIZES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
