'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ValueChip } from '@/components/ui';
import { MapPin, ArrowRight, Trophy } from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { BeanCardStack } from './FeaturedRoasters';

interface InFocusSectionProps {
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
}

export function InFocusSection({ shops, onShopSelect }: InFocusSectionProps) {
  const { ref: sectionRef, revealed: sectionRevealed } = useScrollReveal(0.1);
  const { ref: beansRef, revealed: beansRevealed } = useScrollReveal(0.05);

  const [activeIdx, setActiveIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const handleTabSelect = useCallback((idx: number) => {
    if (idx === activeIdx) return;
    setFadeIn(false);
    setTimeout(() => {
      setActiveIdx(idx);
      setFadeIn(true);
    }, 300);
  }, [activeIdx]);

  // Build tab labels from shop locations
  const tabs = useMemo(() => {
    return shops.map((shop) => {
      const city = shop.location?.name || 'Unknown';
      const countryCode = shop.location?.country?.code || shop.country?.code;
      return { city, countryCode };
    });
  }, [shops]);

  const shop = shops[activeIdx];
  if (!shop) return null;

  return (
    <section
      className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default"
      style={{ background: 'var(--background)' }}
    >
      {/* Section heading */}
      <h2
        ref={sectionRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: sectionRevealed ? 1 : 0,
          transform: sectionRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        In focus
      </h2>

      {/* City tabs */}
      {tabs.length > 1 && (
        <div className="flex items-center gap-2 mb-8">
          {tabs.map((tab, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={i}
                onClick={() => handleTabSelect(i)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-contrastBlock text-contrastText'
                    : 'bg-surface text-text-secondary hover:text-primary'
                }`}
              >
                {tab.countryCode && (
                  <span className="w-4 h-4 flex-shrink-0"><CircleFlag countryCode={tab.countryCode.toLowerCase()} height="16" /></span>
                )}
                {tab.city}
              </button>
            );
          })}
        </div>
      )}

      {/* Content with fade transition */}
      <div
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
        }}
      >
        <ShopContent
          key={shop.documentId}
          shop={shop}
          onShopSelect={onShopSelect}
          beansRef={beansRef}
          beansRevealed={beansRevealed}
        />
      </div>
    </section>
  );
}

/* ─── Shop Content (extracted for clean transitions) ─── */

function ShopContent({
  shop,
  onShopSelect,
  beansRef,
  beansRevealed,
}: {
  shop: Shop;
  onShopSelect: (shop: Shop) => void;
  beansRef: React.Ref<HTMLDivElement>;
  beansRevealed: boolean;
}) {
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const imageUrl = getMediaUrl(shop.featured_image);
  const brand = shop.brand;
  const logoUrl = getMediaUrl(brand?.logo);
  const story = brand?.story;
  const statement = brand?.statement;

  const locationParts = [
    shop.city_area?.name || shop.cityArea?.name,
    shop.location?.name,
  ].filter(Boolean);
  const locationText = locationParts.join(', ');
  const countryCode = shop.location?.country?.code || shop.country?.code;

  const topAwards = useMemo(() => {
    if (!brand?.awards?.length) return [];
    return brand.awards.slice(0, 2);
  }, [brand?.awards]);

  const foundedYear = brand?.founded ? new Date(brand.founded).getFullYear() : null;

  const displayBeans = useMemo(() => {
    if (!brand?.beans) return [];
    return brand.beans.filter((b) => getMediaUrl(b.photo));
  }, [brand?.beans]);

  const stagger = (delay: number) => ({
    opacity: contentVisible ? 1 : 0,
    transform: contentVisible ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity 0.5s ease-out ${delay}s, transform 0.5s ease-out ${delay}s`,
  });

  return (
    <>
      {/* 1. Photos + Details row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Photo mosaic — 3/5 width */}
        <div className="lg:col-span-3" style={{ minHeight: '280px' }}>
          <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
            <div className="col-span-1 row-span-2 relative overflow-hidden rounded-xl">
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={shop.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 30vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
              )}
            </div>

            <div className="col-span-1 row-span-1 relative overflow-hidden rounded-xl">
              <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
            </div>

            <div className="col-span-1 row-span-1 relative overflow-hidden rounded-xl">
              <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30" />
            </div>
          </div>
        </div>

        {/* Details panel — 2/5 width */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden bg-surface p-6 md:p-8 lg:p-10">
          <div className="flex flex-col gap-5 h-full">
            {/* Brand logo */}
            {logoUrl && (
              <div style={stagger(0.05)}>
                <Image src={logoUrl} alt={brand?.name || ''} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
              </div>
            )}

            {/* Shop name */}
            <h3
              className="font-display text-3xl md:text-4xl text-primary -mt-1"
              style={stagger(0.1)}
            >
              {shop.name}
            </h3>

            {/* Location with flag */}
            {locationText && (
              <div className="flex items-center gap-2 text-text-secondary -mt-1" style={stagger(0.15)}>
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{locationText}</span>
                {countryCode && (
                  <span className="w-3.5 h-3.5 flex-shrink-0"><CircleFlag countryCode={countryCode.toLowerCase()} height="14" /></span>
                )}
                {foundedYear && (
                  <span className="text-sm text-text-secondary opacity-60">
                    &middot; Est. {foundedYear}
                  </span>
                )}
              </div>
            )}

            {/* Statement */}
            {statement && (
              <div className="border-t border-border-default pt-4" style={stagger(0.2)}>
                <p className="text-base text-primary font-medium leading-relaxed">
                  {statement}
                </p>
              </div>
            )}

            {/* Story */}
            {story && (
              <div className="border-t border-border-default pt-4" style={stagger(0.25)}>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {story}
                </p>
              </div>
            )}

            {/* Awards — ValueChip pills */}
            {topAwards.length > 0 && (
              <div className="border-t border-border-default pt-4" style={stagger(0.3)}>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                  Awards
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topAwards.map((award, i) => (
                    <ValueChip
                      key={i}
                      startContent={<Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
                    >
                      {award.award}
                    </ValueChip>
                  ))}
                </div>
                {topAwards.some((a) => a.winner || a.year) && (
                  <p className="text-xs text-text-secondary mt-2">
                    {topAwards
                      .map((a) => [a.winner, a.year].filter(Boolean).join(', '))
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* CTA */}
            <div style={stagger(0.35)} className="mt-auto pt-2">
              <button
                onClick={() => onShopSelect(shop)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-contrastBlock text-contrastText text-sm font-medium hover:opacity-90 transition-opacity"
              >
                View on map
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Beans carousel */}
      {displayBeans.length > 0 && (
        <div
          ref={beansRef}
          className="mt-4 rounded-2xl overflow-hidden bg-surface py-6 md:py-8"
        >
          <div
            style={{
              opacity: beansRevealed ? 1 : 0,
              transform: beansRevealed ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s',
            }}
          >
            <BeanCardStack
              beans={displayBeans}
              brandName={brand?.name || shop.name}
              fadeBg="var(--surface)"
            />
          </div>
        </div>
      )}
    </>
  );
}
