import { differenceInDays, differenceInWeeks, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

/**
 * Returns a human-readable relative time label for a date string.
 * "Today", "Yesterday", "3 days ago", "2 weeks ago", or "15 Jan" for older dates.
 */
export function getRelativeTimeLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';

  const days = differenceInDays(new Date(), date);
  if (days <= 6) return `${days} days ago`;

  const weeks = differenceInWeeks(new Date(), date);
  if (weeks <= 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;

  return format(date, 'd MMM');
}

/**
 * Returns a section group label for chronological grouping.
 * "Today", "Yesterday", "This Week", "This Month", or "Mon YYYY" for older.
 */
export function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'This Week';
  if (isThisMonth(date)) return 'This Month';
  return format(date, 'MMMM yyyy');
}
