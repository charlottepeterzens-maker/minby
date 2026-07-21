import { useEffect } from "react";

/**
 * Tracks the iOS on-screen keyboard using visualViewport and exposes its
 * height as a CSS custom property `--keyboard-inset` on <html>.
 *
 * Combine with the `.keyboard-safe` utility (padding-bottom driven by that var)
 * so bottom sheets, composers and sticky footers stay above the keyboard.
 *
 * Idempotent — safe to mount once at the app root.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const root = document.documentElement;

    const update = () => {
      // On iOS the visualViewport height shrinks by the keyboard height.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.setProperty("--keyboard-inset", "0px");
    };
  }, []);
}
