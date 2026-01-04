'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { Location, Country, Shop } from '@/lib/types';
import { ExploreModal } from '../modals/ExploreModal';
import { SegmentedControl } from '../ui/SegmentedControl';

interface DestinationSelectorProps {
  locations: Location[];
  countries?: Country[];
  allShops?: Shop[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
}

// Get flag URL from country code
const getFlagUrl = (countryCode: string): string =>
  `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`;

export function DestinationSelector({
  locations,
  countries = [],
  allShops = [],
  selectedLocation,
  onLocationChange,
  isNearbyMode,
  onNearbyToggle,
}: DestinationSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLocationSelect = (location: Location) => {
    onLocationChange(location);
    setIsModalOpen(false);
  };

  const handleSegmentChange = (key: string) => {
    if (key === 'nearby') {
      if (!isNearbyMode) {
        onNearbyToggle();
      }
    } else if (key === 'explore') {
      if (isNearbyMode) {
        onNearbyToggle();
      }
      setIsModalOpen(true);
    }
  };

  // Determine active segment
  const activeSegment = isNearbyMode ? 'nearby' : 'explore';

  // Build explore label with flag and chevron
  const exploreLabel = (
    <span className="flex items-center gap-1.5">
      {selectedLocation?.country?.code && (
        <span className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={getFlagUrl(selectedLocation.country.code)}
            alt=""
            width={16}
            height={16}
            className="object-cover w-full h-full"
            unoptimized
          />
        </span>
      )}
      <span className="truncate">{selectedLocation ? selectedLocation.name : 'Explore'}</span>
      <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-50" />
    </span>
  );

  return (
    <>
      <SegmentedControl
        segments={[
          { key: 'nearby', label: 'Nearby' },
          { key: 'explore', label: exploreLabel },
        ]}
        activeSegment={activeSegment}
        onSegmentChange={handleSegmentChange}
      />

      <ExploreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        locations={locations}
        countries={countries}
        allShops={allShops}
        onLocationSelect={handleLocationSelect}
      />
    </>
  );
}
