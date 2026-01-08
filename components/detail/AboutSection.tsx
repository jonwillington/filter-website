'use client';

import { useState } from 'react';
import { Shop, OpeningHours } from '@/lib/types';
import { getShopDescription } from '@/lib/utils';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface AboutSectionProps {
  shop: Shop;
}

const MAX_LENGTH = 200;

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

// Extract today's closing time from opening hours
function getTodayClosingTime(hours: unknown): string | null {
  if (!hours) return null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];

  let todayHours: string | null = null;

  // Handle array format: ["Monday: 10:00 AM – 9:00 PM", ...]
  if (Array.isArray(hours)) {
    const todayEntry = hours.find((entry) =>
      typeof entry === 'string' && entry.startsWith(today + ':')
    );
    if (todayEntry) {
      todayHours = todayEntry.substring(today.length + 2).trim();
    }
  } else if (isOpeningHoursObject(hours)) {
    if (hours.today) todayHours = hours.today;
    else if (hours.display) todayHours = hours.display;
  }

  if (!todayHours) return null;

  // Check for closed
  if (todayHours.toLowerCase().includes('closed')) return null;

  // Extract closing time from formats like "10:00 AM – 9:00 PM" or "10:00 AM - 9:00 PM"
  const parts = todayHours.split(/\s*[–-]\s*/);
  if (parts.length >= 2) {
    return parts[parts.length - 1].trim();
  }

  return null;
}

// Get description appropriate for the About section
// For branded shops: show brand story/description (shop.description shown separately as "About This Branch")
// For independent shops: show shop description with brand fallback
function getAboutDescription(shop: Shop): string | null {
  if (!shop.independent && shop.brand) {
    // Branded shop: prefer brand story/description for the main "About" section
    if (shop.brand.story) return shop.brand.story;
    if (shop.brand.description) return shop.brand.description;
    // Fall back to shop description if brand has none
    if (shop.description) return shop.description;
    return null;
  }
  // Independent shop: use standard fallback chain
  return getShopDescription(shop);
}

export function AboutSection({ shop }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const description = getAboutDescription(shop);

  const closingTime = getTodayClosingTime(shop.opening_hours);

  // Show alert when we have a closing time for today
  const showOpenAlert = !!closingTime;

  if (!description && !showOpenAlert) return null;

  const isLong = description ? description.length > MAX_LENGTH : false;
  const displayText = description
    ? (expanded || !isLong ? description : description.slice(0, MAX_LENGTH).trim() + '...')
    : null;

  return (
    <div className="mt-5">
      {/* Open today alert */}
      {showOpenAlert && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-emerald-700 dark:text-emerald-300">
            Open today until <span className="font-medium">{closingTime}</span>
          </span>
        </div>
      )}

      {displayText && (
      <div className="space-y-2">
        <p className="text-sm text-text leading-snug whitespace-pre-line">
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-accent hover:text-secondary transition-colors"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
      )}
    </div>
  );
}
