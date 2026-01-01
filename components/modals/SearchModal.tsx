'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Input } from '@heroui/react';
import { Search, MapPin, Coffee, X } from 'lucide-react';
import { Location, Shop } from '@/lib/types';
import { slugify, getShopSlug } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  shops: Shop[];
}

interface SearchResult {
  type: 'location' | 'shop';
  id: string;
  name: string;
  subtitle?: string;
  location?: Location;
  shop?: Shop;
}

export function SearchModal({ isOpen, onClose, locations, shops }: SearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Fuzzy search implementation
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search locations (cities)
    locations.forEach((location) => {
      const name = location.name.toLowerCase();
      const countryName = location.country?.name?.toLowerCase() || '';

      // Match on city name or country name
      if (name.includes(query) || countryName.includes(query)) {
        results.push({
          type: 'location',
          id: location.documentId,
          name: location.name,
          subtitle: location.country?.name || '',
          location,
        });
      }
    });

    // Search shops
    shops.forEach((shop) => {
      const name = shop.name.toLowerCase();
      const neighbourhood = shop.neighbourhood?.toLowerCase() || '';
      const address = shop.address?.toLowerCase() || '';
      const cityArea = shop.city_area?.name?.toLowerCase() || shop.cityArea?.name?.toLowerCase() || '';
      const city = shop.location?.name?.toLowerCase() || '';

      // Match on shop name, neighbourhood, address, or area
      if (
        name.includes(query) ||
        neighbourhood.includes(query) ||
        address.includes(query) ||
        cityArea.includes(query) ||
        city.includes(query)
      ) {
        const locationName = shop.location?.name || '';
        const areaName = shop.city_area?.name || shop.cityArea?.name || '';
        const subtitle = areaName && locationName ? `${areaName}, ${locationName}` : locationName || areaName;

        results.push({
          type: 'shop',
          id: shop.documentId,
          name: shop.name,
          subtitle,
          shop,
        });
      }
    });

    // Sort results: locations first, then shops, then alphabetically by name
    return results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'location' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, locations, shops]);

  // Group results by type
  const locationResults = searchResults.filter((r) => r.type === 'location');
  const shopResults = searchResults.filter((r) => r.type === 'shop');

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'location' && result.location) {
      const countrySlug = slugify(result.location.country?.name ?? '');
      const citySlug = slugify(result.location.name);
      router.push(`/${countrySlug}/${citySlug}`);
    } else if (result.type === 'shop' && result.shop) {
      const countrySlug = slugify(result.shop.location?.country?.name ?? '');
      const citySlug = slugify(result.shop.location?.name ?? '');
      const areaSlug = slugify(result.shop.city_area?.name ?? result.shop.cityArea?.name ?? 'All');
      const shopSlug = getShopSlug(result.shop);

      if (countrySlug && citySlug && areaSlug && shopSlug) {
        router.push(`/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`);
      }
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        backdrop: 'bg-black/50',
        base: 'max-h-[600px]',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pb-2">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <Input
              autoFocus
              placeholder="Search for shops or destinations..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              variant="underlined"
              classNames={{
                input: 'text-lg',
                inputWrapper: 'shadow-none',
              }}
            />
          </div>
        </ModalHeader>
        <ModalBody className="pb-6">
          {searchQuery.trim().length < 2 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Start typing to search for shops or destinations
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <X className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
              <p className="font-medium" style={{ color: 'var(--text)' }}>
                No results found
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Destinations */}
              {locationResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Destinations
                  </h3>
                  <div className="space-y-1">
                    {locationResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-opacity-50 transition-colors text-left"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--surface)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--surface)' }}
                        >
                          <MapPin className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
                            {result.name}
                          </p>
                          {result.subtitle && (
                            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shops */}
              {shopResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Shops
                  </h3>
                  <div className="space-y-1">
                    {shopResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-opacity-50 transition-colors text-left"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--surface)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--surface)' }}
                        >
                          <Coffee className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
                            {result.name}
                          </p>
                          {result.subtitle && (
                            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
