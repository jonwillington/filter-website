'use client';

import { ChevronLeft, X } from 'lucide-react';

interface StickyDrawerHeaderProps {
  title: string;
  opacity: number;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Sticky header for drawers that fades in as user scrolls.
 * Uses negative margin to not affect layout when hidden.
 */
export function StickyDrawerHeader({ title, opacity, onClose, onBack, backLabel }: StickyDrawerHeaderProps) {
  return (
    <div
      className="sticky top-0 left-0 right-0 z-30 bg-background border-b border-gray-200 dark:border-white/10 px-4 py-2 flex items-center justify-between h-14 -mb-14"
      style={{
        opacity,
        pointerEvents: opacity > 0.5 ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-out',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-shrink-0 p-1 -ml-1 hover:opacity-60 transition-opacity"
            aria-label={backLabel ? `Back to ${backLabel}` : 'Go back'}
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary" />
          </button>
        )}
        <h2 className="text-base font-semibold text-primary truncate">
          {title}
        </h2>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-border-default transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-text-secondary" />
      </button>
    </div>
  );
}
