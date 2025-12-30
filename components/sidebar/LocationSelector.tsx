'use client';

import { Select, SelectItem, type SharedSelection } from '@heroui/react';
import { Location } from '@/lib/types';
import { MapPin } from 'lucide-react';

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
}

export function LocationSelector({
  locations,
  selectedLocation,
  onLocationChange,
  isNearbyMode,
  onNearbyToggle,
}: LocationSelectorProps) {
  const handleChange = (keys: SharedSelection) => {
    if (keys === 'all') return;
    const value = Array.from(keys)[0] as string | undefined;

    if (value === 'nearby') {
      onNearbyToggle();
    } else if (value) {
      const location = locations.find((l) => l.documentId === value);
      onLocationChange(location ?? null);
    }
  };

  const selectedKeys = isNearbyMode
    ? new Set(['nearby'])
    : selectedLocation
    ? new Set([selectedLocation.documentId])
    : new Set<string>();

  return (
    <Select
      label="Location"
      placeholder="Select a city"
      selectedKeys={selectedKeys}
      onSelectionChange={handleChange}
      startContent={<MapPin className="w-4 h-4 text-accent" />}
      classNames={{
        trigger: 'bg-surface border-border hover:bg-white',
        value: 'text-text',
        label: 'text-textSecondary',
      }}
      items={[
        { key: 'nearby', name: 'Nearby', isNearby: true },
        ...locations.map((l) => ({ key: l.documentId, name: l.name, isNearby: false })),
      ]}
    >
      {(item) => (
        <SelectItem
          key={item.key}
          startContent={item.isNearby ? <MapPin className="w-4 h-4 text-accent" /> : undefined}
        >
          {item.name}
        </SelectItem>
      )}
    </Select>
  );
}
