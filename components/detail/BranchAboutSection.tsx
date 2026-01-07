'use client';

import { useState } from 'react';
import { Shop } from '@/lib/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Divider } from '@heroui/react';

interface BranchAboutSectionProps {
  shop: Shop;
}

const MAX_LENGTH = 200;

export function BranchAboutSection({ shop }: BranchAboutSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // Only show for non-independent shops that have their own description
  if (shop.independent || !shop.brand || !shop.description) return null;

  const description = shop.description;
  const isLong = description.length > MAX_LENGTH;
  const displayText = expanded || !isLong
    ? description
    : description.slice(0, MAX_LENGTH).trim() + '...';

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div>
        <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
          About This Branch
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
    </>
  );
}
