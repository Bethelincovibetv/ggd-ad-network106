import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseScrollNavVisibilityOptions {
  /**
   * Minimum scroll delta in pixels before triggering visibility change.
   * Prevents jitter on micro-scrolls or finger vibration.
   * Default: 8px
   */
  threshold?: number;
  /**
   * Distance from the top of the viewport (in px) where the header & footer
   * are guaranteed to be fully visible.
   * Default: 32px
   */
  topOffset?: number;
  /**
   * Optional list of dependencies that, when updated (e.g. active tab or route),
   * immediately reset navigation visibility to visible.
   */
  resetOnDeps?: unknown[];
}

/**
 * YouTube-style scroll visibility hook:
 * - When scrolling DOWN: Navigation (header & footer) smoothly slides out of view to maximize reading space.
 * - When scrolling UP: Navigation immediately glides back into view.
 * - When at or near the top of the page: Navigation is always visible.
 * - Clamps iOS/Android rubber-banding bounce so negative scroll positions don't falsely trigger hide.
 */
export function useScrollNavVisibility({
  threshold = 8,
  topOffset = 32,
  resetOnDeps = [],
}: UseScrollNavVisibilityOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const isTickingRef = useRef(false);

  // Manual trigger to force visibility (e.g., when search is focused or button tapped)
  const showNav = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideNav = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Reset visibility to true whenever dependencies (e.g. activeTab) change
  useEffect(() => {
    setIsVisible(true);
    if (typeof window !== 'undefined') {
      lastScrollYRef.current = Math.max(0, window.scrollY || window.pageYOffset || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetOnDeps);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize position
    lastScrollYRef.current = Math.max(0, window.scrollY || window.pageYOffset || 0);

    const onScroll = () => {
      if (isTickingRef.current) return;

      isTickingRef.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
        const prevScrollY = lastScrollYRef.current;
        const delta = currentScrollY - prevScrollY;

        // 1. Always keep visible when near the top of the page
        if (currentScrollY <= topOffset) {
          setIsVisible(true);
        }
        // 2. Scrolling DOWN past the delta threshold -> Hide
        else if (delta > threshold) {
          setIsVisible(false);
        }
        // 3. Scrolling UP past the delta threshold -> Show
        else if (delta < -threshold) {
          setIsVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
        isTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold, topOffset]);

  return { isVisible, showNav, hideNav };
}
