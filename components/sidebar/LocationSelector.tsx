'use client';

import { Select, SelectItem, SelectSection, type SharedSelection } from '@heroui/react';
import { Location } from '@/lib/types';
import { MapPin } from 'lucide-react';
import { useMemo } from 'react';

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

  // Group locations by country and create a flat list with section headers
  const groupedItems = useMemo(() => {
    const groups: Record<string, Location[]> = {};

    locations.forEach((location) => {
      const countryName = location.country?.name ?? 'Other';
      if (!groups[countryName]) {
        groups[countryName] = [];
      }
      groups[countryName].push(location);
    });

    // Sort countries alphabetically
    const sortedCountries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    // Create flat list with country headers interspersed
    const items: Array<{
      key: string;
      name: string;
      isNearby?: boolean;
      isHeader?: boolean;
    }> = [
      { key: 'nearby', name: 'Nearby', isNearby: true }
    ];

    sortedCountries.forEach(([countryName, countryLocations]) => {
      // Add country header
      items.push({
        key: `header-${countryName}`,
        name: countryName,
        isHeader: true
      });
      // Add locations under this country
      countryLocations.forEach((location) => {
        items.push({
          key: location.documentId,
          name: location.name
        });
      });
    });

    return items;
  }, [locations]);

  return (
    <Select
      label="Where do you want to go?"
      placeholder="Select a city"
      selectedKeys={selectedKeys}
      onSelectionChange={handleChange}
      startContent={<MapPin className="w-4 h-4 text-accent" />}
      classNames={{
        trigger: 'bg-surface border-border hover:bg-white',
        value: 'text-text',
        label: 'text-textSecondary',
        listbox: 'p-0',
      }}
      items={groupedItems}
      disabledKeys={groupedItems.filter(item => item.isHeader).map(item => item.key)}
    >
      {(item) => (
        <SelectItem
          key={item.key}
          textValue={item.name}
          startContent={item.isNearby ? <MapPin className="w-4 h-4 text-accent" /> : undefined}
          className={item.isHeader ? 'text-xs font-semibold text-textSecondary uppercase tracking-wider opacity-100 cursor-default px-2 py-1 bg-gray-50' : ''}
        >
          {item.name}
        </SelectItem>
      )}
    </Select>
  );
}
