import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether the page is scrolled past a threshold.
 * Used to fade the TopBar out and bring it back at the top.
 */
export const useScrolled = (threshold = 24) => {
  const [scrolled, setScrolled] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setScrolled(window.scrollY > threshold));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [threshold]);

  return scrolled;
};
