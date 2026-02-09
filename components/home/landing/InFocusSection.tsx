'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Shop } from '@/lib/types';
import { getMediaUrl, getMergedBrewMethods } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BrewMethodChip, CountryChip, PropertyRow } from '@/components/ui';
import { MapPin, ArrowRight, Trophy } from 'lucide-react';

interface InFocusSectionProps {
  shop: Shop;
  onShopSelect: (shop: Shop) => void;
}

const BREW_METHOD_LABELS: Record<string, string> = {
  has_espresso: 'Espresso',
  has_filter_coffee: 'Filter',
  has_v60: 'V60',
  has_chemex: 'Chemex',
  has_aeropress: 'AeroPress',
  has_french_press: 'French Press',
  has_cold_brew: 'Cold Brew',
  has_batch_brew: 'Batch Brew',
  has_slow_bar: 'Slow Bar',
};

export function InFocusSection({ shop, onShopSelect }: InFocusSectionProps) {
  const { ref: sectionRef, revealed: sectionRevealed } = useScrollReveal(0.1);
  const { ref: contentRef, revealed: contentRevealed } = useScrollReveal(0.05);
  const { ref: beansRef, revealed: beansRevealed } = useScrollReveal(0.05);

  const imageUrl = getMediaUrl(shop.featured_image);
  const brand = shop.brand;
  const story = brand?.story;
  const statement = brand?.statement;

  // Location text
  const locationParts = [
    shop.city_area?.name || shop.cityArea?.name,
    shop.location?.name,
  ].filter(Boolean);
  const locationText = locationParts.join(', ');

  // Brew methods
  const brewMethods = useMemo(() => {
    const merged = getMergedBrewMethods(shop);
    return Object.entries(merged)
      .filter(([, val]) => val)
      .map(([key]) => BREW_METHOD_LABELS[key])
      .filter(Boolean);
  }, [shop]);

  // Bean origin countries (deduplicated)
  const beanOrigins = useMemo(() => {
    if (!brand?.beans?.length) return [];
    const seen = new Set<string>();
    const origins: Array<{ name: string; code: string }> = [];
    for (const bean of brand.beans) {
      if (!bean.origins) continue;
      for (const origin of bean.origins) {
        if (origin.code && !seen.has(origin.code)) {
          seen.add(origin.code);
          origins.push({ name: origin.name, code: origin.code });
        }
      }
    }
    return origins;
  }, [brand?.beans]);

  // Equipment highlights
  const equipment = brand?.equipment;
  const equipmentRows = useMemo(() => {
    if (!equipment) return [];
    const rows: Array<{ label: string; value: string }> = [];
    if (equipment.roasters?.length) rows.push({ label: 'Roaster', value: equipment.roasters.join(', ') });
    if (equipment.espresso?.length) rows.push({ label: 'Espresso machine', value: equipment.espresso.join(', ') });
    if (equipment.grinders?.length) rows.push({ label: 'Grinder', value: equipment.grinders.join(', ') });
    if (equipment.drippers?.length) rows.push({ label: 'Dripper', value: equipment.drippers.join(', ') });
    return rows;
  }, [equipment]);

  // Awards (top 2)
  const topAwards = useMemo(() => {
    if (!brand?.awards?.length) return [];
    return brand.awards.slice(0, 2);
  }, [brand?.awards]);

  // Founded year
  const foundedYear = brand?.founded ? new Date(brand.founded).getFullYear() : null;

  // All beans with photos for the bottom row
  const displayBeans = useMemo(() => {
    if (!brand?.beans) return [];
    return brand.beans
      .filter((b) => getMediaUrl(b.photo))
      .map((b) => {
        const origins = b.origins?.filter((o) => o.name && o.code) || [];
        const flavors = b.flavorTags?.map((f) => f.name).filter(Boolean) || [];
        const processLabel = b.process
          ? b.process.replace(/\b\w/g, (c) => c.toUpperCase())
          : null;
        return {
          name: b.name,
          url: getMediaUrl(b.photo)!,
          type: b.type === 'single-origin' ? 'Single Origin' : b.type === 'blend' ? 'Blend' : null,
          origins,
          flavors,
          process: processLabel,
          region: b.region,
          farm: b.farm,
          altitude: b.altitude,
        };
      });
  }, [brand?.beans]);

  const fadeIn = (delay: number) => ({
    opacity: contentRevealed ? 1 : 0,
    transform: contentRevealed ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
  });

  return (
    <section
      className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default"
      style={{ background: 'var(--surface-landing)' }}
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

      {/* Card container */}
      <div
        ref={contentRef}
        className="bg-surface rounded-2xl border border-border-default overflow-hidden"
      >
        {/* Top: image + details */}
        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* Left: Featured image — 3/5 width */}
          {imageUrl && (
            <div
              className="lg:col-span-3 p-4 md:p-6 lg:p-8"
              style={fadeIn(0)}
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={shop.name}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 55vw, 100vw"
                />
              </div>
            </div>
          )}

          {/* Right: Details — 2/5 width */}
          <div className="lg:col-span-2 p-6 md:p-8 lg:p-10 flex flex-col gap-5">
            {/* Label */}
            <div style={fadeIn(0.05)}>
              <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                In Focus
              </span>
            </div>

            {/* Shop name */}
            <h3
              className="font-display text-3xl md:text-4xl text-primary -mt-1"
              style={fadeIn(0.1)}
            >
              {shop.name}
            </h3>

            {/* Location */}
            {locationText && (
              <div className="flex items-center gap-2 text-text-secondary -mt-1" style={fadeIn(0.15)}>
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{locationText}</span>
                {foundedYear && (
                  <span className="text-sm text-text-secondary opacity-60">
                    &middot; Est. {foundedYear}
                  </span>
                )}
              </div>
            )}

            {/* Statement */}
            {statement && (
              <p
                className="text-base text-primary font-medium leading-relaxed"
                style={fadeIn(0.2)}
              >
                {statement}
              </p>
            )}

            {/* Story */}
            {story && (
              <div style={fadeIn(0.25)}>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {story}
                </p>
              </div>
            )}

            {/* Brew methods */}
            {brewMethods.length > 0 && (
              <div style={fadeIn(0.3)}>
                <div className="flex flex-wrap gap-1.5">
                  {brewMethods.map((method) => (
                    <BrewMethodChip key={method}>{method}</BrewMethodChip>
                  ))}
                </div>
              </div>
            )}

            {/* Bean origins */}
            {beanOrigins.length > 0 && (
              <div style={fadeIn(0.35)}>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                  Sourcing origins
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {beanOrigins.map((origin) => (
                    <CountryChip key={origin.code} code={origin.code} name={origin.name} />
                  ))}
                </div>
              </div>
            )}

            {/* Equipment — PropertyRow with dividers */}
            {equipmentRows.length > 0 && (
              <div style={fadeIn(0.4)} className="border-t border-border-default pt-1">
                {equipmentRows.map((row, i) => (
                  <PropertyRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    showDivider={i > 0}
                  />
                ))}
              </div>
            )}

            {/* Awards */}
            {topAwards.length > 0 && (
              <div style={fadeIn(0.45)} className="border-t border-border-default pt-4">
                <div className="space-y-2">
                  {topAwards.map((award, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-primary font-medium">{award.award}</p>
                        <p className="text-xs text-text-secondary">
                          {award.winner} &middot; {award.year}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={fadeIn(0.5)} className="mt-auto pt-2">
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

        {/* Bottom: Beans row — full width */}
        {displayBeans.length > 0 && (
          <div
            ref={beansRef}
            className="border-t border-border-default px-6 md:px-8 lg:px-10 py-6 md:py-8"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-4"
              style={{
                opacity: beansRevealed ? 1 : 0,
                transition: 'opacity 0.5s ease-out',
              }}
            >
              {displayBeans.length} beans roasted in-house
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {displayBeans.map((bean, i) => (
                <div
                  key={bean.name}
                  className="flex gap-3 rounded-xl border border-border-default bg-background overflow-hidden"
                  style={{
                    opacity: beansRevealed ? 1 : 0,
                    transform: beansRevealed ? 'translateY(0)' : 'translateY(12px)',
                    transition: `opacity 0.5s ease-out ${i * 0.06}s, transform 0.5s ease-out ${i * 0.06}s`,
                  }}
                >
                  {/* Square thumbnail */}
                  <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                    <img src={bean.url} alt={bean.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Details */}
                  <div className="py-2.5 pr-3 flex-1 min-w-0 flex flex-col">
                    <h4 className="text-sm font-medium text-primary line-clamp-1">{bean.name}</h4>

                    {(bean.type || bean.process) && (
                      <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">
                        {[bean.type, bean.process].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {bean.origins.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {bean.origins.map((origin) => (
                          <span key={origin.code} className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                            <img
                              src={`https://flagcdn.com/w40/${origin.code.toLowerCase()}.png`}
                              alt={origin.name}
                              className="w-3 h-3 rounded-full"
                            />
                            {origin.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {bean.flavors.length > 0 && (
                      <p className="text-[11px] text-text-secondary italic mt-auto pt-1 line-clamp-1">
                        {bean.flavors.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
