/**
 * Opening status utilities for determining shop open/closed state
 * Adapted from filter-expo
 */

export type OpeningStatus = 'open' | 'closed' | 'closing-soon';

export interface OpeningStatusResult {
  status: OpeningStatus;
  statusText: string;
  closingTime: string | null;
}

/**
 * Parse string array hours into a map of day -> hours
 */
function parseStringArrayHours(hoursArray: string[]): { [key: string]: string } {
  const daysMap: { [key: string]: string } = {};

  hoursArray.forEach(str => {
    if (typeof str !== 'string') return;
    const colonIndex = str.indexOf(':');
    if (colonIndex > 0) {
      const day = str.substring(0, colonIndex).trim();
      const hours = str.substring(colonIndex + 1).trim();
      daysMap[day] = hours;
    }
  });

  return daysMap;
}

/**
 * Parse time string like "8:00 AM" or "6:00 PM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Get opening status from opening hours data
 * Returns status (open/closed/closing-soon) and status text
 */
export function getOpeningStatus(openingHours: unknown): OpeningStatusResult {
  if (!openingHours) {
    return { status: 'closed', statusText: 'Hours not available', closingTime: null };
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[dayOfWeek];

  // Handle string array format: ["Monday: 8:00 AM – 6:00 PM", ...]
  if (Array.isArray(openingHours)) {
    const parsedHours = parseStringArrayHours(openingHours);
    const todayHours = parsedHours[todayName];

    if (!todayHours || todayHours.toLowerCase().includes('closed')) {
      return { status: 'closed', statusText: 'Closed today', closingTime: null };
    }

    // Parse the hours range (handles –, -, —)
    const parts = todayHours.split(/[–\-—]/);
    if (parts.length !== 2) {
      return { status: 'closed', statusText: 'Hours unavailable', closingTime: null };
    }

    const openTimeStr = parts[0].trim();
    const closeTimeStr = parts[1].trim();

    const currentMinutes = currentHour * 60 + currentMinute;
    const openMinutes = parseTimeToMinutes(openTimeStr);
    const closeMinutes = parseTimeToMinutes(closeTimeStr);

    if (openMinutes === null || closeMinutes === null) {
      return { status: 'closed', statusText: 'Hours unavailable', closingTime: null };
    }

    // Handle shops that close past midnight
    const closesNextDay = closeMinutes < openMinutes;

    const isCurrentlyOpen = closesNextDay
      ? (currentMinutes >= openMinutes)
      : (currentMinutes >= openMinutes && currentMinutes < closeMinutes);

    if (isCurrentlyOpen) {
      const minutesUntilClose = closesNextDay
        ? (1440 - currentMinutes)
        : (closeMinutes - currentMinutes);

      // Closing soon if within 60 minutes
      if (minutesUntilClose <= 60) {
        return {
          status: 'closing-soon',
          statusText: `Closes at ${closeTimeStr}`,
          closingTime: closeTimeStr
        };
      }

      return {
        status: 'open',
        statusText: `Open until ${closeTimeStr}`,
        closingTime: closeTimeStr
      };
    }

    // Before opening today
    if (currentMinutes < openMinutes) {
      return {
        status: 'closed',
        statusText: `Opens at ${openTimeStr}`,
        closingTime: null
      };
    }

    // After closing
    return { status: 'closed', statusText: 'Closed', closingTime: null };
  }

  // Handle object format with periods
  if (typeof openingHours === 'object' && openingHours !== null) {
    const hoursObj = openingHours as { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> };

    if (!hoursObj.periods || hoursObj.periods.length === 0) {
      return { status: 'closed', statusText: 'Hours not available', closingTime: null };
    }

    const currentTime = currentHour * 100 + currentMinute;
    const todayPeriod = hoursObj.periods.find(p => p.open.day === dayOfWeek);

    if (!todayPeriod) {
      return { status: 'closed', statusText: 'Closed today', closingTime: null };
    }

    const openTime = parseInt(todayPeriod.open.time);
    const closeTime = todayPeriod.close ? parseInt(todayPeriod.close.time) : 2400;

    // Format times for display
    const formatTime = (time: number) => {
      const hours24 = Math.floor(time / 100);
      const mins = time % 100;
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
      const period = hours24 >= 12 ? 'PM' : 'AM';
      return mins === 0 ? `${hours12} ${period}` : `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    const closingTimeFormatted = todayPeriod.close ? formatTime(closeTime) : '';
    const openingTimeFormatted = formatTime(openTime);

    const closesNextDay = closeTime === 0 && openTime > 0;
    const isCurrentlyOpen = closesNextDay
      ? (currentTime >= openTime)
      : (currentTime >= openTime && currentTime < closeTime);

    if (isCurrentlyOpen) {
      const currentMinutes = currentHour * 60 + currentMinute;
      const minutesUntilClose = closesNextDay
        ? (1440 - currentMinutes)
        : ((Math.floor(closeTime / 100) * 60 + (closeTime % 100)) - currentMinutes);

      if (minutesUntilClose <= 60) {
        return {
          status: 'closing-soon',
          statusText: `Closes at ${closingTimeFormatted}`,
          closingTime: closingTimeFormatted
        };
      }

      return {
        status: 'open',
        statusText: `Open until ${closingTimeFormatted}`,
        closingTime: closingTimeFormatted
      };
    } else if (currentTime < openTime) {
      return {
        status: 'closed',
        statusText: `Opens at ${openingTimeFormatted}`,
        closingTime: null
      };
    }

    return { status: 'closed', statusText: 'Closed', closingTime: null };
  }

  return { status: 'closed', statusText: 'Hours not available', closingTime: null };
}

/**
 * Get the CSS classes for the status dot color
 */
export function getStatusDotColor(status: OpeningStatus): string {
  switch (status) {
    case 'open':
      return 'bg-emerald-500';
    case 'closing-soon':
      return 'bg-amber-500';
    case 'closed':
    default:
      return 'bg-red-500';
  }
}
