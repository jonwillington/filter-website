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
      color="primary"
      size="sm"
      className={className}
      classNames={{
        tabList: 'bg-surface p-1',
        tab: 'text-sm font-medium',
        cursor: 'bg-white shadow-sm',
      }}
    >
      {segments.map((segment) => (
        <Tab key={segment.key} title={segment.label} />
      ))}
    </Tabs>
  );
}
