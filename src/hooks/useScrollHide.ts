import { useEffect, useState } from "react";

/**
 * Returns true when the page is scrolled past `threshold`.
 * Used to calmly hide the TopBar while scrolling and bring it back at the top.
 */
export function useScrollHide(threshold = 24) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
