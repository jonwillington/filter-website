'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Returns a callback ref and a boolean `revealed`. Attach the ref to an element —
 * `revealed` flips to true once the element enters the viewport.
 * Uses a callback ref so it works even when the element mounts after the hook runs.
 */
export function useScrollReveal(threshold = 0.15) {
  const [revealed, setRevealed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;
      if (revealed) return; // Already revealed, no need to observe

      // Respect reduced motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setRevealed(true);
        return;
      }

      // If element is already in or above the viewport (e.g. scroll restored), reveal instantly
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        setRevealed(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        },
        { threshold },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [threshold, revealed],
  );

  return { ref, revealed };
}
