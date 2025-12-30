'use client';

import { cn } from '@/lib/utils';

interface Segment {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  activeSegment: string;
  onSegmentChange: (key: string) => void;
  className?: string;
}

export function SegmentedControl({
  segments,
  activeSegment,
  onSegmentChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg bg-gray-200 p-1 gap-1',
        className
      )}
    >
      {segments.map((segment) => {
        const isActive = segment.key === activeSegment;
        return (
          <button
            key={segment.key}
            onClick={() => onSegmentChange(segment.key)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
