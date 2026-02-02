'use client';

import { memo } from 'react';
import { ChevronRight } from 'lucide-react';

interface LocationCellProps {
  onClick: () => void;
}

function LocationCellComponent({ onClick }: LocationCellProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 cursor-pointer transition-colors text-left group"
      aria-label="Explore cities"
    >
      <span className="text-[1.5rem] font-medium text-primary leading-tight group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
        Explore
      </span>
      <ChevronRight className="w-5 h-5 text-text-secondary flex-shrink-0" />
    </button>
  );
}

// Memoize to prevent unnecessary re-renders
export const LocationCell = memo(LocationCellComponent);
