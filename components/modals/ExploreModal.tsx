'use client';

import { useMemo } from 'react';
import { ModalBody, ScrollShadow } from '@heroui/react';
import { X, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Location, Country } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui';

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  countries?: Country[];
  onLocationSelect: (location: Location) => void;
}

// Region display order
const REGION_ORDER = [
  'Europe',
  'Asia',
  'North America',
  'Central Asia',
  'Oceania',
  'South America',
  'Middle East',
  'Africa',
];

// Get flag URL from country code
const getFlagUrl = (countryCode: string): string =>
  `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`;

interface CountryGroup {
  country: Country;
  locations: Location[];
}

interface RegionGroup {
  region: string;
  countries: CountryGroup[];
}

export function ExploreModal({
  isOpen,
  onClose,
  locations,
  countries = [],
  onLocationSelect,
}: ExploreModalProps) {
  // Create a map of country code -> country (with region) from the countries prop
  const countryMap = useMemo(() => {
    const map = new Map<string, Country>();
    countries.forEach((c) => {
      if (c.code) {
        map.set(c.code.toUpperCase(), c);
      }
    });
    return map;
  }, [countries]);

  // Group locations by region -> country
  const groupedData = useMemo((): RegionGroup[] => {
    const regionMap: Record<string, Record<string, CountryGroup>> = {};

    locations.forEach((location) => {
      const locationCountry = location.country;
      if (!locationCountry) return;

      // Get the full country data from countries prop (which has region object)
      const fullCountry = countryMap.get(locationCountry.code?.toUpperCase() || '') || locationCountry;

      // Access region.Name from the country object
      const region = fullCountry.region?.Name || 'Other';
      const countryName = fullCountry.name || locationCountry.name;

      if (!regionMap[region]) {
        regionMap[region] = {};
      }
      if (!regionMap[region][countryName]) {
        regionMap[region][countryName] = { country: fullCountry, locations: [] };
      }
      regionMap[region][countryName].locations.push(location);
    });

    // Build ordered result
    const orderedRegions = REGION_ORDER.filter((r) => regionMap[r]);
    const otherRegions = Object.keys(regionMap).filter((r) => !REGION_ORDER.includes(r));
    const allRegions = [...orderedRegions, ...otherRegions];

    return allRegions
      .map((region) => ({
        region,
        countries: Object.values(regionMap[region] || {})
          .sort((a, b) => a.country.name.localeCompare(b.country.name))
          .map((group) => ({
            ...group,
            locations: group.locations.sort((a, b) => a.name.localeCompare(b.name)),
          })),
      }))
      .filter((r) => r.countries.length > 0);
  }, [locations, countryMap]);

  const handleLocationClick = (location: Location) => {
    onLocationSelect(location);
    onClose();
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      hideCloseButton
      modalClassNames={{
        backdrop: 'bg-black/60 backdrop-blur-sm',
        base: 'max-h-[90vh] bg-white',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-5 lg:py-6">
          <h2 className="text-xl lg:text-2xl font-display" style={{ color: 'var(--text)' }}>
            Where to?
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      <ModalBody className="p-0">
        <ScrollShadow className="max-h-[75vh]">
          {/* Desktop: Multi-column masonry-style layout */}
          <div className="hidden lg:block px-8 py-8">
            <div className="columns-3 gap-12">
              {groupedData.map(({ region, countries: regionCountries }) => (
                <div key={region} className="break-inside-avoid mb-12">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-6 pb-3 border-b border-gray-100">
                    {region}
                  </h3>
                  <div className="space-y-8">
                    {regionCountries.map(({ country, locations: locs }) => (
                      <CountryGroupItem
                        key={country.documentId || country.code}
                        country={country}
                        locations={locs}
                        onLocationClick={handleLocationClick}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Clean stacked layout */}
          <div className="lg:hidden px-5 py-6">
            {groupedData.map(({ region, countries: regionCountries }, idx) => (
              <div key={region} className={idx > 0 ? 'mt-10 pt-8 border-t border-gray-100' : ''}>
                <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-6">
                  {region}
                </h3>
                <div className="space-y-8">
                  {regionCountries.map(({ country, locations: locs }) => (
                    <CountryGroupItem
                      key={country.documentId || country.code}
                      country={country}
                      locations={locs}
                      onLocationClick={handleLocationClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollShadow>
      </ModalBody>
    </ResponsiveModal>
  );
}

// Shared country + locations component
function CountryGroupItem({
  country,
  locations,
  onLocationClick,
}: {
  country: Country;
  locations: Location[];
  onLocationClick: (location: Location) => void;
}) {
  return (
    <div>
      {/* Country - dominant with custom font */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
          <Image
            src={getFlagUrl(country.code)}
            alt={country.name}
            width={24}
            height={24}
            className="object-cover w-full h-full"
            unoptimized
          />
        </div>
        <span className="text-lg font-display" style={{ color: 'var(--text)' }}>
          {country.name}
        </span>
      </div>
      {/* Locations - clickable with chevrons */}
      <div className="pl-9 space-y-0.5">
        {locations.map((location) => (
          <button
            key={location.documentId}
            onClick={() => onLocationClick(location)}
            className="group w-full flex items-center justify-between py-2 transition-colors hover:text-accent"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="text-[15px]">
              {location.name}
            </span>
            <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:text-accent transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
