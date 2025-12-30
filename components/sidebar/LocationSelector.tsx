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

  // Group locations by country
  const locationsByCountry = useMemo(() => {
    const groups: Record<string, Location[]> = {};

    locations.forEach((location) => {
      const countryName = location.country?.name ?? 'Other';
      if (!groups[countryName]) {
        groups[countryName] = [];
      }
      groups[countryName].push(location);
    });

    // Sort countries alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [locations]);

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
    >
      <SelectSection title="Quick Access">
        <SelectItem
          key="nearby"
          startContent={<MapPin className="w-4 h-4 text-accent" />}
        >
          Nearby
        </SelectItem>
      </SelectSection>

      {locationsByCountry.map(([countryName, countryLocations]) => (
        <SelectSection key={countryName} title={countryName}>
          {countryLocations.map((location) => (
            <SelectItem key={location.documentId}>
              {location.name}
            </SelectItem>
          ))}
        </SelectSection>
      ))}
    </Select>
  );
}
