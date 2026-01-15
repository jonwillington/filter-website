import {
  isToday as dateIsToday,
  isTomorrow as dateIsTomorrow,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isFuture,
  isSameDay,
} from 'date-fns';
import type { Event } from '../types';

/**
 * Check if an event starts today
 */
export function isEventToday(startDate: string): boolean {
  return dateIsToday(new Date(startDate));
}

/**
 * Check if an event starts tomorrow
 */
export function isEventTomorrow(startDate: string): boolean {
  return dateIsTomorrow(new Date(startDate));
}

/**
 * Check if an event starts within the next 7 days
 */
export function isEventWithinWeek(startDate: string): boolean {
  const target = new Date(startDate);
  const now = new Date();
  const days = differenceInDays(target, now);
  return days >= 0 && days < 7;
}

/**
 * Get a human-readable date label for an event
 * Returns "Today", "Tomorrow", or a formatted date
 */
export function getEventDateLabel(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);

  if (isEventToday(startDate)) {
    return 'Today';
  }

  if (isEventTomorrow(startDate)) {
    return 'Tomorrow';
  }

  // Format: "May 8" or "May 8 - 11" for multi-day events
  const startFormatted = format(start, 'MMM d');

  if (endDate) {
    const end = new Date(endDate);
    if (!isSameDay(start, end)) {
      // Multi-day event
      if (start.getMonth() === end.getMonth()) {
        // Same month: "May 8 - 11"
        return `${startFormatted} - ${format(end, 'd')}`;
      } else {
        // Different months: "May 8 - Jun 2"
        return `${startFormatted} - ${format(end, 'MMM d')}`;
      }
    }
  }

  return startFormatted;
}

/**
 * Format the time portion of an event
 */
export function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'h:mm a'); // e.g., "4:00 PM"
}

/**
 * Calculate countdown values for an event
 * Returns null if event is more than 7 days away or in the past
 */
export function calculateCountdown(startDate: string): {
  days: number;
  hours: number;
  minutes: number;
  isWithinWeek: boolean;
  formattedCountdown: string | null;
} | null {
  const target = new Date(startDate);
  const now = new Date();

  if (!isFuture(target)) {
    return null;
  }

  const totalMinutes = differenceInMinutes(target, now);
  const totalHours = differenceInHours(target, now);
  const days = differenceInDays(target, now);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const isWithinWeek = days < 7;

  let formattedCountdown: string | null = null;
  if (isWithinWeek) {
    if (days > 0) {
      formattedCountdown = `${days}d ${hours}h`;
    } else if (totalHours > 0) {
      formattedCountdown = `${totalHours}h ${minutes}m`;
    } else {
      formattedCountdown = `${totalMinutes}m`;
    }
  }

  return { days, hours, minutes, isWithinWeek, formattedCountdown };
}

/**
 * Filter events to only include future events
 */
export function filterFutureEvents(events: Event[]): Event[] {
  const now = new Date();
  return events.filter((event) => {
    const startDate = new Date(event.start_date);
    return startDate >= now;
  });
}

/**
 * Sort events by start date (soonest first)
 */
export function sortEventsByDate(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
}
