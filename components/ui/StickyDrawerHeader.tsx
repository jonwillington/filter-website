'use client';

import { X } from 'lucide-react';

interface StickyDrawerHeaderProps {
  title: string;
  opacity: number;
  onClose: () => void;
}

/**
 * Sticky header for drawers that fades in as user scrolls.
 * Uses negative margin to not affect layout when hidden.
 */
export function StickyDrawerHeader({ title, opacity, onClose }: StickyDrawerHeaderProps) {
  return (
    <div
      className="sticky top-0 left-0 right-0 z-30 bg-background border-b border-border-default px-5 py-3 flex items-center justify-between h-14 -mb-14"
      style={{
        opacity,
        pointerEvents: opacity > 0.5 ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-out',
      }}
    >
      <h2 className="text-base font-semibold text-contrastBlock truncate pr-4">
        {title}
      </h2>
      <button
        onClick={onClose}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-surface hover:bg-surfaceHover transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-textSecondary" />
      </button>
    </div>
  );
}
