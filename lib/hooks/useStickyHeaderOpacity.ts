'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

interface UseStickyHeaderOpacityOptions {
  /** Scroll offset before opacity starts increasing (default: 50px) */
  startOffset?: number;
  /** Scroll range over which opacity transitions from 0 to 1 (default: 70px) */
  transitionRange?: number;
}

interface UseStickyHeaderOpacityReturn {
  /** Current opacity value (0-1) */
  opacity: number;
  /** Reset opacity to 0 (call when content changes) */
  resetOpacity: () => void;
}

/**
 * Hook for managing sticky header opacity based on scroll position.
 * Used by drawer components to fade in a sticky header as user scrolls.
 *
 * @param scrollRef - Ref to the scrollable container
 * @param options - Configuration options
 */
export function useStickyHeaderOpacity(
  scrollRef: RefObject<HTMLElement | null>,
  options: UseStickyHeaderOpacityOptions = {}
): UseStickyHeaderOpacityReturn {
  const { startOffset = 50, transitionRange = 70 } = options;
  const [opacity, setOpacity] = useState(0);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  // Track when scrollRef.current changes
  useEffect(() => {
    const checkRef = () => {
      if (scrollRef.current !== scrollContainer) {
        setScrollContainer(scrollRef.current);
      }
    };
    // Check immediately and set up an interval to catch changes
    checkRef();
    const interval = setInterval(checkRef, 100);
    return () => clearInterval(interval);
  }, [scrollRef, scrollContainer]);

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;
    // Calculate opacity: 0 until startOffset, then linear increase over transitionRange
    const newOpacity = Math.min(Math.max((scrollTop - startOffset) / transitionRange, 0), 1);
    setOpacity(newOpacity);
  }, [startOffset, transitionRange]);

  const resetOpacity = useCallback(() => {
    setOpacity(0);
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer, handleScroll]);

  return { opacity, resetOpacity };
}
