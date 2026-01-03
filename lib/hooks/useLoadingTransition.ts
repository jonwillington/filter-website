'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseLoadingTransitionOptions {
  /** Default timeout duration in ms (default: 2500) */
  defaultTimeout?: number;
  /** Long timeout for operations like geolocation (default: 5000) */
  longTimeout?: number;
}

interface UseLoadingTransitionReturn {
  /** Current loading state */
  isLoading: boolean;
  /** Start loading with optional custom timeout */
  startLoading: (timeout?: number) => void;
  /** Start loading with long timeout (for geolocation, etc.) */
  startLongLoading: () => void;
  /** Complete loading immediately */
  completeLoading: () => void;
}

/**
 * Hook for managing loading transitions with timeout fallbacks.
 * Prevents infinite loading states by auto-completing after timeout.
 */
export function useLoadingTransition(
  options: UseLoadingTransitionOptions = {}
): UseLoadingTransitionReturn {
  const { defaultTimeout = 2500, longTimeout = 5000 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoading = useCallback((timeout: number = defaultTimeout) => {
    clearLoadingTimeout();
    setIsLoading(true);

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      timeoutRef.current = null;
    }, timeout);
  }, [defaultTimeout, clearLoadingTimeout]);

  const startLongLoading = useCallback(() => {
    startLoading(longTimeout);
  }, [startLoading, longTimeout]);

  const completeLoading = useCallback(() => {
    clearLoadingTimeout();
    setIsLoading(false);
  }, [clearLoadingTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return clearLoadingTimeout;
  }, [clearLoadingTimeout]);

  return {
    isLoading,
    startLoading,
    startLongLoading,
    completeLoading,
  };
}
