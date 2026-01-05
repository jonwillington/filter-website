'use client';

import { useState } from 'react';
import { Shop } from '@/lib/types';
import { getShopDescription } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AboutSectionProps {
  shop: Shop;
}

const MAX_LENGTH = 200;

export function AboutSection({ shop }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const description = getShopDescription(shop);

  if (!description) return null;

  const isLong = description.length > MAX_LENGTH;
  const displayText = expanded || !isLong
    ? description
    : description.slice(0, MAX_LENGTH).trim() + '...';

  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
        About
      </h3>
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
