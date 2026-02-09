'use client';

import { useMemo, useState } from 'react';
import { Shop } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ShopCard } from './ShopCard';

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
    if (!activeRegion) return shops.slice(0, 9);

    const filtered = shops.filter((shop) => {
      const countryCode = shop.location?.country?.code?.toUpperCase();
      if (!countryCode) return false;
      return countryRegionMap.get(countryCode) === activeRegion;
    });

    return filtered.slice(0, 9);
  }, [shops, activeRegion, countryRegionMap]);

  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: chipsRef, revealed: chipsRevealed } = useScrollReveal();
  const { ref: gridRef, revealed: gridRevealed } = useScrollReveal(0.05);

  if (shops.length === 0) return null;

  return (
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40" style={{ background: 'var(--surface-landing)' }}>
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Top shops
      </h2>

      {/* Region filter chips */}
      <div
        ref={chipsRef}
        className="mt-5 flex flex-wrap items-center gap-2"
        style={{
          opacity: chipsRevealed ? 1 : 0,
          transform: chipsRevealed ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease-out 0.1s, transform 0.6s ease-out 0.1s',
        }}
      >
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
      <div ref={gridRef} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {filteredShops.map((shop, i) => (
          <div
            key={shop.documentId}
            style={{
              opacity: gridRevealed ? 1 : 0,
              transform: gridRevealed ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.6s ease-out ${i * 0.07}s, transform 0.6s ease-out ${i * 0.07}s`,
            }}
          >
            <ShopCard shop={shop} onClick={onShopSelect} />
          </div>
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
