'use client';

import { Select, SelectItem, SelectSection, type SharedSelection } from '@heroui/react';
import { Location } from '@/lib/types';
import { MapPin } from 'lucide-react';
import { useMemo, useCallback } from 'react';

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
}

// Convert country code to flag emoji
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export function LocationSelector({
  locations,
  selectedLocation,
  onLocationChange,
  isNearbyMode,
  onNearbyToggle,
}: LocationSelectorProps) {
  const handleChange = useCallback((keys: SharedSelection) => {
    if (keys === 'all') return;
    const value = Array.from(keys)[0] as string | undefined;

    if (value === 'nearby') {
      onNearbyToggle();
    } else if (value) {
      const location = locations.find((l) => l.documentId === value);
      onLocationChange(location ?? null);
    }
  }, [locations, onNearbyToggle, onLocationChange]);

  const selectedKeys = useMemo(() => {
    if (isNearbyMode) return new Set(['nearby']);
    if (selectedLocation) return new Set([selectedLocation.documentId]);
    return new Set<string>();
  }, [isNearbyMode, selectedLocation]);

  // Group locations by country and create a flat list with section headers
  const groupedItems = useMemo(() => {
    const groups: Record<string, { locations: Location[]; code: string }> = {};

    locations.forEach((location) => {
      const countryName = location.country?.name ?? 'Other';
      const countryCode = location.country?.code ?? '';
      if (!groups[countryName]) {
        groups[countryName] = { locations: [], code: countryCode };
      }
      groups[countryName].locations.push(location);
    });

    // Sort countries alphabetically
    const sortedCountries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    // Create flat list with country headers interspersed
    const items: Array<{
      key: string;
      name: string;
      isNearby?: boolean;
      isHeader?: boolean;
      countryCode?: string;
    }> = [
      { key: 'nearby', name: 'Nearby', isNearby: true }
    ];

    sortedCountries.forEach(([countryName, { locations: countryLocations, code }]) => {
      // Add country header
      items.push({
        key: `header-${countryName}`,
        name: countryName,
        isHeader: true,
        countryCode: code
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
      startContent={<MapPin className="w-4 h-4 text-accent flex-shrink-0" />}
      classNames={{
        base: 'w-full max-w-full',
        trigger: 'bg-surface border border-border-default hover:bg-border-default shadow-sm',
        value: 'text-text truncate',
        label: 'text-textSecondary',
        innerWrapper: 'max-w-full',
        listbox: 'p-0 bg-background',
        popoverContent: 'bg-background shadow-lg',
      }}
      items={groupedItems}
      disabledKeys={groupedItems.filter(item => item.isHeader).map(item => item.key)}
    >
      {(item) => (
        <SelectItem
          key={item.key}
          textValue={item.name}
          startContent={item.isNearby ? <MapPin className="w-4 h-4 text-accent" /> : undefined}
          className={item.isHeader ? 'opacity-100 cursor-default px-2 py-1 bg-gray-100/80 pointer-events-none' : ''}
        >
          {item.isHeader ? (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-gray-900 uppercase tracking-wider">
              {item.countryCode && <span>{getCountryFlag(item.countryCode)}</span>}
              {item.name}
            </span>
          ) : (
            item.name
          )}
        </SelectItem>
      )}
    </Select>
  );
}
