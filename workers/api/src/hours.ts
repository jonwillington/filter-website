import type { OpeningDay, OpeningHours, TimeRange, Weekday } from '../../../types/api-v3';

/**
 * Normalise the CMS's opening hours into seven structured days.
 *
 * The CMS holds several shapes, all of which appear in production data:
 * - Google text:    ["Monday: 8:00 AM – 6:00 PM", "Tuesday: Closed", …]
 * - Split ranges:   ["Thursday: 8:00 – 11:30 AM, 12:00 – 3:00 PM"]
 * - Day objects:    [{ day: "Monday", open: "08:00", close: "18:00" }, …]
 *                   [{ day: "mon", open: "9:00 AM", close: "6:00 PM" }, …]
 *                   [{ dayOfWeek: "monday", openTime: "08:30", closeTime: "17:00", isClosed: false }, …]
 * - Day-keyed maps: { monday: "07:30-17:00", friday: "7:30am - 4:00pm", notes: "…" }
 *
 * A day whose text can't be parsed comes back as `unknown` with its source text,
 * so nothing the CMS holds is lost.
 */

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function parseOpeningHours(raw: unknown): OpeningHours | null {
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (value === null || value === undefined) return null;

  const texts = new Map<number, string | null>();
  const direct = new Map<number, TimeRange[]>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        const match = item.match(/^\s*([A-Za-z]+)\s*:\s*(.*)$/);
        if (!match) continue;
        if (/^(daily|everyday)$/i.test(match[1])) {
          DAY_NAMES.forEach((_, i) => texts.has(i) || texts.set(i, match[2].trim()));
          continue;
        }
        const day = dayIndex(match[1]);
        if (day >= 0) texts.set(day, match[2].trim());
      } else if (item && typeof item === 'object') {
        // { day, open, close } or { dayOfWeek, openTime, closeTime, isClosed }
        const obj = item as Record<string, unknown>;
        const dayName = obj.day ?? obj.dayOfWeek;
        const day = typeof dayName === 'string' ? dayIndex(dayName) : -1;
        if (day < 0) continue;
        const openText = obj.open ?? obj.openTime;
        const closeText = obj.close ?? obj.closeTime;
        const open = typeof openText === 'string' ? parseTime(openText, null) : null;
        const close = typeof closeText === 'string' ? parseTime(closeText, null) : null;
        if (obj.isClosed === true || obj.closed === true) {
          texts.set(day, 'Closed');
        } else if (open !== null && close !== null) {
          direct.set(day, [...(direct.get(day) ?? []), { open: fmt(open), close: fmt(close) }]);
          texts.set(day, `${openText} – ${closeText}`);
        } else if (typeof obj.hours === 'string') {
          texts.set(day, obj.hours);
        }
      }
    }
  } else if (typeof value === 'object') {
    for (const [key, text] of Object.entries(value as Record<string, unknown>)) {
      const day = dayIndex(key);
      if (day < 0) continue;
      texts.set(day, typeof text === 'string' ? text.trim() : null);
    }
  } else {
    return null;
  }

  if (texts.size === 0 && direct.size === 0) return null;

  const days: OpeningDay[] = DAY_NAMES.map((_, i) => {
    const weekday = (i + 1) as Weekday;
    const text = texts.get(i) ?? null;
    const ranges = direct.get(i);
    if (ranges) return { weekday, status: 'open', ranges, text };
    if (text === null) return { weekday, status: 'unknown', ranges: [], text: null };
    return { weekday, ...parseDayText(text), text };
  });

  return { days };
}

function parseDayText(text: string): Pick<OpeningDay, 'status' | 'ranges'> {
  const clean = text
    .replace(/[   ]/g, ' ')
    .replace(/[–—‑−]/g, '-')
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase();

  if (clean === '' ) return { status: 'unknown', ranges: [] };
  if (clean === 'closed') return { status: 'closed', ranges: [] };
  if (/^open 24 hours$|^24 hours$|^24\/7$/.test(clean)) return { status: 'open24h', ranges: [] };

  const ranges: TimeRange[] = [];
  for (const part of clean.split(/,|&|\band\b/)) {
    const bits = part.split(/\s*-\s*|\s+to\s+/).filter(Boolean);
    if (bits.length !== 2) return { status: 'unknown', ranges: [] };

    const closeMeridiem = meridiemOf(bits[1]);
    const openMeridiem = meridiemOf(bits[0]);
    const close = parseTime(bits[1], openMeridiem);
    let open = parseTime(bits[0], closeMeridiem);
    if (open === null || close === null) return { status: 'unknown', ranges: [] };

    // Google writes "8:00 – 11:30 AM" and "2:30 – 8:00 PM", leaving the opening
    // meridiem implied. If borrowing the closing meridiem puts opening after
    // closing on the same day, the opening time was in the morning.
    if (!openMeridiem && closeMeridiem === 'pm' && open > close) {
      open = parseTime(bits[0], 'am');
      if (open === null) return { status: 'unknown', ranges: [] };
    }

    ranges.push({ open: fmt(open), close: fmt(close) });
  }

  return ranges.length > 0 ? { status: 'open', ranges } : { status: 'unknown', ranges: [] };
}

function meridiemOf(text: string): 'am' | 'pm' | null {
  const m = text.trim().match(/(a\.?m\.?|p\.?m\.?)$/i);
  if (!m) return null;
  return m[1].toLowerCase().startsWith('a') ? 'am' : 'pm';
}

/** Minutes since midnight, or null if the text isn't a time. */
function parseTime(text: string, fallbackMeridiem: 'am' | 'pm' | null): number | null {
  const m = text.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = m[2] ? Number(m[2]) : 0;
  if (minutes > 59) return null;

  const meridiem = m[3] ? (m[3].toLowerCase().startsWith('a') ? 'am' : 'pm') : fallbackMeridiem;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  } else if (hours > 24 || (hours === 24 && minutes > 0)) {
    return null;
  }

  return (hours % 24) * 60 + minutes;
}

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "Monday", "monday" or "mon" → 0. */
function dayIndex(name: string): number {
  const key = name.trim().toLowerCase();
  if (key.length < 3) return -1;
  return DAY_NAMES.findIndex(day => day === key || (key.length === 3 && day.startsWith(key)));
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
