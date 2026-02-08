'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Shop } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

const REGION_ORDER = [
  'Europe',
  'East Asia',
  'North America',
  'Central Asia',
  'Africa',
  'North Africa',
  'Sub-Saharan Africa',
  'South America',
];

interface FeaturedShopsProps {
  shops: Shop[];
  countryRegionMap: Map<string, string>;
  onShopSelect: (shop: Shop) => void;
}

export function FeaturedShops({ shops, countryRegionMap, onShopSelect }: FeaturedShopsProps) {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  // Derive available regions from the shops
  const availableRegions = useMemo(() => {
    const regionSet = new Set<string>();
    for (const shop of shops) {
      const countryCode = shop.location?.country?.code?.toUpperCase();
      if (countryCode) {
        const region = countryRegionMap.get(countryCode);
        if (region) regionSet.add(region);
      }
    }
    // Sort by REGION_ORDER
    return REGION_ORDER.filter((r) => regionSet.has(r));
  }, [shops, countryRegionMap]);

  // Filter shops by active region
  const filteredShops = useMemo(() => {
    if (!activeRegion) return shops.slice(0, 6);

    const filtered = shops.filter((shop) => {
      const countryCode = shop.location?.country?.code?.toUpperCase();
      if (!countryCode) return false;
      return countryRegionMap.get(countryCode) === activeRegion;
    });

    return filtered.slice(0, 6);
  }, [shops, activeRegion, countryRegionMap]);

  if (shops.length === 0) return null;

  return (
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 bg-surface">
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-primary">
        Top shops
      </h2>

      {/* Region filter chips */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveRegion(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeRegion === null
              ? 'bg-primary text-background'
              : 'bg-border-default text-text-secondary hover:text-primary'
          }`}
        >
          Globally
        </button>
        {availableRegions.map((region) => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeRegion === region
                ? 'bg-primary text-background'
                : 'bg-border-default text-text-secondary hover:text-primary'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Shop grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {filteredShops.map((shop) => (
          <ShopCard key={shop.documentId} shop={shop} onSelect={onShopSelect} />
        ))}
      </div>

      {filteredShops.length === 0 && activeRegion && (
        <p className="mt-8 text-text-secondary text-center">
          No recommended shops in {activeRegion} yet.
        </p>
      )}
    </section>
  );
}

function ShopCard({ shop, onSelect }: { shop: Shop; onSelect: (shop: Shop) => void }) {
  const imageUrl = getMediaUrl(shop.featured_image);
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);
  const cityName = shop.location?.name || shop.city_area?.location?.name;
  const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
  const statement = isIndependent ? shop.brand?.statement : shop.description;

  return (
    <button
      onClick={() => onSelect(shop)}
      className="w-full text-left group"
    >
      {/* Big image */}
      <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        )}

        {/* Brand logo badge */}
        {logoUrl && (
          <div className="absolute bottom-4 left-4 w-14 h-14 rounded-full overflow-hidden bg-white shadow-md border-2 border-white">
            <Image
              src={logoUrl}
              alt={shop.brand?.name || ''}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Text below image */}
      <div className="mt-3">
        <h3 className="text-lg font-medium text-primary line-clamp-1 group-hover:text-accent transition-colors">
          {displayName}
        </h3>
        {cityName && (
          <p className="text-sm text-text-secondary mt-0.5">{cityName}</p>
        )}
        {statement && (
          <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{statement}</p>
        )}
      </div>
    </button>
  );
}
