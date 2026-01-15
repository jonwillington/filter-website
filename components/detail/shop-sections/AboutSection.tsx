'use client';

import { useState } from 'react';
import { Shop } from '@/lib/types';
import { getShopDescription } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AboutSectionProps {
  shop: Shop;
}

const MAX_LENGTH = 200;

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

  if (!description) return null;

  const isLong = description.length > MAX_LENGTH;
  const displayText = expanded || !isLong
    ? description
    : description.slice(0, MAX_LENGTH).trim() + '...';

  return (
    <div className="mt-5">
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
    </div>
  );
}
