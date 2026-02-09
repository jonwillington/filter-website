'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Shop } from '@/lib/types';
import { getMediaUrl, getMergedBrewMethods } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BrewMethodChip, CountryChip, PropertyRow } from '@/components/ui';
import { MapPin, ArrowRight, Trophy } from 'lucide-react';
import { BeanCard } from './BeanCard';

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

  // Beans with photos for the bottom row
  const displayBeans = useMemo(() => {
    if (!brand?.beans) return [];
    return brand.beans.filter((b) => getMediaUrl(b.photo));
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
      {/* Card container */}
      <div
        ref={contentRef}
        className="bg-surface rounded-2xl border border-border-default overflow-hidden"
      >
        {/* Top: image + details */}
        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* Left: Featured image with overlaid heading — 3/5 width */}
          <div
            ref={sectionRef}
            className="lg:col-span-3 relative"
            style={{
              opacity: sectionRevealed ? 1 : 0,
              transform: sectionRevealed ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
            }}
          >
            {imageUrl ? (
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={shop.name}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 55vw, 100vw"
                />
                {/* Gradient for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                {/* Overlaid heading */}
                <h2 className="absolute top-4 left-5 md:top-6 md:left-7 font-display text-5xl md:text-6xl lg:text-8xl text-white/60 leading-none select-none pointer-events-none">
                  In focus
                </h2>
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-white/5 flex items-end p-6">
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-none">
                  In focus
                </h2>
              </div>
            )}
          </div>

          {/* Right: Details — 2/5 width */}
          <div className="lg:col-span-2 p-6 md:p-8 lg:p-10 flex flex-col gap-5">

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
              <div className="border-t border-border-default pt-4" style={fadeIn(0.2)}>
                <p className="text-base text-primary font-medium leading-relaxed">
                  {statement}
                </p>
              </div>
            )}

            {/* Story */}
            {story && (
              <div className="border-t border-border-default pt-4" style={fadeIn(0.25)}>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {story}
                </p>
              </div>
            )}

            {/* Brew methods */}
            {brewMethods.length > 0 && (
              <div className="border-t border-border-default pt-4" style={fadeIn(0.3)}>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                  Brew methods
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {brewMethods.map((method) => (
                    <BrewMethodChip key={method}>{method}</BrewMethodChip>
                  ))}
                </div>
              </div>
            )}

            {/* Bean origins */}
            {beanOrigins.length > 0 && (
              <div className="border-t border-border-default pt-4" style={fadeIn(0.35)}>
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
              <div className="border-t border-border-default pt-4" style={fadeIn(0.4)}>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                  Equipment
                </p>
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
              <div className="border-t border-border-default pt-4" style={fadeIn(0.45)}>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                  Awards
                </p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayBeans.map((bean, i) => (
                <div
                  key={bean.documentId}
                  style={{
                    opacity: beansRevealed ? 1 : 0,
                    transform: beansRevealed ? 'translateY(0)' : 'translateY(12px)',
                    transition: `opacity 0.5s ease-out ${i * 0.06}s, transform 0.5s ease-out ${i * 0.06}s`,
                  }}
                >
                  <BeanCard bean={bean} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
