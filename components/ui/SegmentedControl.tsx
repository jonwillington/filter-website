'use client';

import { Tabs, Tab } from '@heroui/react';

/**
 * SegmentedControl - A tab-based segmented control using HeroUI Tabs
 *
 * Features:
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Proper ARIA attributes for accessibility
 * - Smooth animations
 * - Consistent with HeroUI design system
 *
 * @example
 * <SegmentedControl
 *   segments={[
 *     { key: 'top', label: 'Top Picks' },
 *     { key: 'all', label: 'All' }
 *   ]}
 *   activeSegment="top"
 *   onSegmentChange={(key) => setFilter(key)}
 * />
 */

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
    <Tabs
      selectedKey={activeSegment}
      onSelectionChange={(key) => onSegmentChange(key as string)}
      variant="solid"
      color="default"
      size="sm"
      fullWidth
      className={className}
      classNames={{
        base: 'w-full',
        tabList: 'bg-gray-200/80 p-1 w-full gap-0 rounded-lg',
        tab: 'text-sm font-medium h-8',
        tabContent: 'text-gray-600 group-data-[selected=true]:text-gray-900',
        cursor: 'bg-white shadow-md rounded-md',
      }}
    >
      {segments.map((segment) => (
        <Tab key={segment.key} title={segment.label} />
      ))}
    </Tabs>
  );
}
