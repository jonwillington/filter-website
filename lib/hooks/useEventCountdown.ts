'use client';

import { useState, useEffect, useCallback } from 'react';
import { calculateCountdown } from '../utils/eventDateUtils';

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  isWithinWeek: boolean;
  formattedCountdown: string | null;
}

/**
 * Hook for managing a countdown timer to an event
 * Updates every minute and returns formatted countdown text
 * Returns null values if event is more than 7 days away
 */
export function useEventCountdown(startDate: string): CountdownState {
  const getCountdown = useCallback(() => {
    const result = calculateCountdown(startDate);
    return result ?? {
      days: 0,
      hours: 0,
      minutes: 0,
      isWithinWeek: false,
      formattedCountdown: null,
    };
  }, [startDate]);

  const [countdown, setCountdown] = useState<CountdownState>(getCountdown);

  useEffect(() => {
    // Initial update
    setCountdown(getCountdown());

    // Only set up interval if event is within 7 days
    const initialCountdown = getCountdown();
    if (!initialCountdown.isWithinWeek) {
      return;
    }

    // Update every minute
    const interval = setInterval(() => {
      setCountdown(getCountdown());
    }, 60000);

    return () => clearInterval(interval);
  }, [getCountdown]);

  return countdown;
}
