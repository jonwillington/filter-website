'use client';

import { useState } from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Location, Country } from '@/lib/types';
import { ExploreModal } from '../modals/ExploreModal';

interface DestinationSelectorProps {
  locations: Location[];
  countries?: Country[];
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

  return (
    <div className="space-y-2">
      {/* Nearby Button */}
      <button
        onClick={onNearbyToggle}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          ${isNearbyMode
            ? 'border-accent bg-accent/5'
            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
          }
        `}
      >
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isNearbyMode ? 'bg-accent/10' : 'bg-gray-100'}
        `}>
          <MapPin
            className="w-4 h-4"
            style={{ color: isNearbyMode ? 'var(--accent)' : 'var(--text-secondary)' }}
          />
        </div>
        <span
          className="flex-1 text-left font-medium text-sm"
          style={{ color: isNearbyMode ? 'var(--accent)' : 'var(--text)' }}
        >
          Nearby
        </span>
        {isNearbyMode && (
          <div className="w-2 h-2 rounded-full bg-accent" />
        )}
      </button>

      {/* Explore / Selected Location Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          ${selectedLocation && !isNearbyMode
            ? 'border-accent bg-accent/5'
            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
          }
        `}
      >
        {selectedLocation && !isNearbyMode ? (
          <>
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-gray-100">
              <Image
                src={getFlagUrl(selectedLocation.country?.code || '')}
                alt={selectedLocation.country?.name || ''}
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                {selectedLocation.name}
              </p>
              <p className="text-xs truncate text-gray-400">
                {selectedLocation.country?.name}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base">🌍</span>
            </div>
            <span className="flex-1 text-left font-medium text-sm" style={{ color: 'var(--text)' }}>
              Explore destinations
            </span>
          </>
        )}
        <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-300" />
      </button>

      <ExploreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        locations={locations}
        countries={countries}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}
