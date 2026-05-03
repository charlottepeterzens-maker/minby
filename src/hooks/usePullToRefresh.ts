import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const ignoreTouch = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    ignoreTouch.current = !!target?.closest('button, a, input, textarea, select, [role="button"], [role="link"]');
    if (ignoreTouch.current) return;

    const el = containerRef.current;
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (ignoreTouch.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 8) {
      setPulling(true);
      setPullDistance(Math.min(delta * 0.5, 120));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (ignoreTouch.current) {
      ignoreTouch.current = false;
      return;
    }
    if (refreshing) return;
    if (pulling && pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    setPulling(false);
    ignoreTouch.current = false;
  }, [pullDistance, threshold, onRefresh, refreshing]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    containerRef,
    pullDistance,
    refreshing,
    progress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
