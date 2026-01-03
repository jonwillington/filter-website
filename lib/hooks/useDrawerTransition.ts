'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseDrawerTransitionOptions<T> {
  /** Current item to display */
  item: T;
  /** Key to identify when item changes (e.g., documentId) */
  getKey: (item: T) => string;
  /** Ref to scroll container for scroll-to-top on transition */
  scrollRef?: RefObject<HTMLElement>;
  /** Transition duration in ms (default: 200) */
  duration?: number;
}

interface UseDrawerTransitionReturn<T> {
  /** The current item being displayed (may lag behind input during transition) */
  displayedItem: T;
  /** Whether a transition is in progress */
  isTransitioning: boolean;
}

/**
 * Hook for managing drawer content transitions with fade out/in animation.
 * Handles smooth transitions when switching between items (e.g., shops).
 */
export function useDrawerTransition<T>({
  item,
  getKey,
  scrollRef,
  duration = 200,
}: UseDrawerTransitionOptions<T>): UseDrawerTransitionReturn<T> {
  const [displayedItem, setDisplayedItem] = useState<T>(item);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousKeyRef = useRef<string>(getKey(item));

  useEffect(() => {
    const currentKey = getKey(item);
    const previousKey = previousKeyRef.current;

    if (currentKey !== previousKey) {
      // Start transition
      setIsTransitioning(true);

      // Wait for fade out, then update displayed item
      const timeout = setTimeout(() => {
        setDisplayedItem(item);
        previousKeyRef.current = currentKey;

        // Scroll to top
        if (scrollRef?.current) {
          scrollRef.current.scrollTop = 0;
        }

        // Fade back in
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [item, getKey, scrollRef, duration]);

  return {
    displayedItem,
    isTransitioning,
  };
}
