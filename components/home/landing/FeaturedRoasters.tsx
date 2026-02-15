'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Shop, Brand, Bean } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BrewMethodChip, CountryChip, ResponsiveModal } from '@/components/ui';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Store } from 'lucide-react';

interface RoasterInfo {
  brand: Brand;
  beans: Bean[];
  logoUrl: string;
  shopCount: number;
  ownShops: Shop[];
  stockists: Shop[];
  brandShops: Shop[];
}

interface FeaturedRoastersProps {
  shops: Shop[];
}

export function FeaturedRoasters({ shops }: FeaturedRoastersProps) {
  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: gridRef, revealed: gridRevealed } = useScrollReveal(0.05);

  const topRoasters = useMemo<RoasterInfo[]>(() => {
    const brandMap = new Map<string, { brand: Brand; beans: Bean[]; ownShops: Set<string> }>();

    for (const shop of shops) {
      const brand = shop.brand;
      if (!brand?.documentId || !brand.roastOwnBeans) continue;

      const beans = brand.beans || [];
      const existing = brandMap.get(brand.documentId);

      if (!existing) {
        const logoUrl = getMediaUrl(brand.logo);
        if (!logoUrl) continue;
        brandMap.set(brand.documentId, { brand, beans, ownShops: new Set([shop.documentId]) });
      } else {
        existing.ownShops.add(shop.documentId);
        if (beans.length > existing.beans.length) {
          existing.brand = brand;
          existing.beans = beans;
        }
      }
    }

    // Score and sort brands
    const candidates = Array.from(brandMap.values())
      .filter((r) => r.beans.length >= 3)
      .map((c) => {
        let score = c.beans.length;
        score += c.beans.filter((b) => getMediaUrl(b.photo)).length * 2;
        if (c.brand.statement) score += 3;
        if (c.brand.story) score += 2;
        if (c.brand.country) score += 1;
        return { ...c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (candidates.length === 0) return [];

    // Build roaster infos with stockists
    const roasterIds = new Set(candidates.map((c) => c.brand.documentId));

    const suppliedShops = new Map<string, Shop[]>();
    candidates.forEach((c) => suppliedShops.set(c.brand.documentId, []));

    for (const shop of shops) {
      const suppliers = shop.brand?.suppliers;
      if (!suppliers?.length) continue;
      for (const supplier of suppliers) {
        if (supplier.documentId && roasterIds.has(supplier.documentId)) {
          suppliedShops.get(supplier.documentId)!.push(shop);
        }
      }
    }

    return candidates.map((c) => {
      const ownShopList = shops.filter((s) => c.ownShops.has(s.documentId));
      const stockistList = suppliedShops.get(c.brand.documentId) || [];
      const seen = new Set(ownShopList.map((s) => s.documentId));
      const allShops = [...ownShopList];
      for (const s of stockistList) {
        if (!seen.has(s.documentId)) {
          seen.add(s.documentId);
          allShops.push(s);
        }
      }

      // Sort beans: photos first, then by data richness
      const sortedBeans = [...c.beans].sort((a, b) => {
        const aPhoto = getMediaUrl(a.photo) ? 1 : 0;
        const bPhoto = getMediaUrl(b.photo) ? 1 : 0;
        if (bPhoto !== aPhoto) return bPhoto - aPhoto;
        const aScore = (a.flavorTags?.length || 0) + (a.origins?.length || 0) + (a.fullDescription ? 2 : 0) + (a.shortDescription ? 1 : 0);
        const bScore = (b.flavorTags?.length || 0) + (b.origins?.length || 0) + (b.fullDescription ? 2 : 0) + (b.shortDescription ? 1 : 0);
        return bScore - aScore;
      });

      return {
        brand: c.brand,
        beans: sortedBeans,
        logoUrl: getMediaUrl(c.brand.logo)!,
        shopCount: allShops.length,
        ownShops: ownShopList,
        stockists: stockistList,
        brandShops: allShops,
      };
    });
  }, [shops]);

  const [activeBrandIdx, setActiveBrandIdx] = useState(0);
  const [shopsModalOpen, setShopsModalOpen] = useState(false);
  const [shopFilter, setShopFilter] = useState<'all' | 'own' | 'stockists'>('all');
  const [brandFadeIn, setBrandFadeIn] = useState(true);

  const handleBrandSelect = useCallback((i: number) => {
    if (i === activeBrandIdx) return;
    setBrandFadeIn(false);
    setTimeout(() => {
      setActiveBrandIdx(i);
      setShopFilter('all');
      setBrandFadeIn(true);
    }, 150);
  }, [activeBrandIdx]);

  if (topRoasters.length === 0) return null;

  const roaster = topRoasters[activeBrandIdx];
  const { brand, beans, logoUrl, shopCount, ownShops, stockists, brandShops } = roaster;
  const hasMix = ownShops.length > 0 && stockists.length > 0;

  const story = brand.statement || brand.story;
  const storyText = story
    ? story.length > 200
      ? story.slice(0, 200).replace(/\s+\S*$/, '') + '...'
      : story
    : null;

  return (
    <section
      className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default"
      style={{
        background: 'linear-gradient(180deg, var(--surface-landing) 0%, var(--surface-warm) 50%, var(--surface-landing) 100%)',
      }}
    >
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Beans
      </h2>

      <div
        ref={gridRef}
        className="rounded-2xl border border-border-default overflow-hidden"
        style={{
          opacity: gridRevealed ? 1 : 0,
          transform: gridRevealed ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
          background: 'color-mix(in srgb, var(--surface-landing) 60%, var(--background))',
        }}
      >
        {/* Brand tabs row */}
        <BrandTabs
          roasters={topRoasters}
          activeIndex={activeBrandIdx}
          onSelect={handleBrandSelect}
        />

        {/* Mobile layout */}
        <div
          className="lg:hidden border-t border-border-default"
          style={{
            opacity: brandFadeIn ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
        >
          <div className="p-5">
            <MobileBrandHeader
              brand={brand}
              logoUrl={logoUrl}
              beanCount={beans.length}
              shopCount={shopCount}
              storyText={storyText}
              onShopsClick={() => setShopsModalOpen(true)}
            />
          </div>
          <div className="border-t border-border-default py-5">
            <BeanCardStack key={brand.documentId} beans={beans} brandName={brand.name} />
          </div>
        </div>

        {/* Desktop layout: brand | carousel */}
        <div
          className="hidden lg:grid lg:grid-cols-[3fr_9fr] border-t border-border-default"
          style={{
            opacity: brandFadeIn ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
        >
          <div className="p-5 lg:p-6">
            <BrandShowcase
              brand={brand}
              logoUrl={logoUrl}
              beanCount={beans.length}
              shopCount={shopCount}
              storyText={storyText}
              onShopsClick={() => setShopsModalOpen(true)}
            />
          </div>
          <div className="border-l border-border-default py-6 overflow-hidden">
            <BeanCardStack key={brand.documentId} beans={beans} brandName={brand.name} />
          </div>
        </div>
      </div>

      {shopsModalOpen && (
        <ShopsModal
          brand={brand}
          logoUrl={logoUrl}
          shopCount={shopCount}
          ownShops={ownShops}
          stockists={stockists}
          brandShops={brandShops}
          hasMix={hasMix}
          shopFilter={shopFilter}
          setShopFilter={setShopFilter}
          onClose={() => setShopsModalOpen(false)}
        />
      )}
    </section>
  );
}

/* ─── Brand Tabs ─── */

function BrandTabs({
  roasters,
  activeIndex,
  onSelect,
}: {
  roasters: RoasterInfo[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide">
      {roasters.map((r, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={r.brand.documentId}
            onClick={() => onSelect(i)}
            className={`flex flex-col items-center gap-2 px-4 py-4 flex-1 min-w-[100px] transition-all duration-200 relative ${
              i > 0 ? 'border-l border-border-default' : ''
            } ${
              isActive
                ? 'bg-surface'
                : 'hover:bg-surface/50 opacity-50 hover:opacity-100'
            }`}
          >
            <Image
              src={r.logoUrl}
              alt={r.brand.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <span className={`text-sm font-display text-center leading-tight line-clamp-2 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              {r.brand.name}
            </span>
            {r.brand.country?.code && (
              <span className="inline-flex items-center gap-1 text-[10px] text-text-secondary">
                <img
                  src={`https://flagcdn.com/w40/${r.brand.country.code.toLowerCase()}.png`}
                  alt={r.brand.country.name || ''}
                  className="w-3.5 h-2.5 rounded-sm"
                />
                {r.brand.country.name}
              </span>
            )}
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Brand Showcase (Desktop, sticky left panel) ─── */

function BrandShowcase({
  brand,
  logoUrl,
  beanCount,
  shopCount,
  storyText,
  onShopsClick,
}: {
  brand: Brand;
  logoUrl: string;
  beanCount: number;
  shopCount: number;
  storyText: string | null;
  onShopsClick: () => void;
}) {
  return (
    <div className="sticky top-28 space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-2">
          <Image src={logoUrl} alt={brand.name} width={56} height={56} className="object-contain w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-2xl xl:text-3xl text-primary leading-tight">
            {brand.name}
          </h3>
          <p className="text-xs font-mono uppercase tracking-wider text-text-secondary opacity-50 mt-1">
            {beanCount} beans
          </p>
        </div>
      </div>

      {brand.statement && storyText !== brand.statement && (
        <p className="text-sm text-text-secondary italic leading-relaxed">
          {brand.statement}
        </p>
      )}

      {storyText && (
        <p className="text-sm text-text-secondary leading-relaxed">
          {storyText}
        </p>
      )}

      {/* Country + Founded */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
        {brand.country && brand.country.code && (
          <span className="inline-flex items-center gap-1.5">
            <img
              src={`https://flagcdn.com/w40/${brand.country.code.toLowerCase()}.png`}
              alt={brand.country.name || ''}
              className="w-5 h-3.5 rounded-sm"
            />
            {brand.country.name}
          </span>
        )}
        {brand.founded && (
          <span>Est. {brand.founded}</span>
        )}
      </div>

      {/* Links */}
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={onShopsClick}
          className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
        >
          <Store className="w-3.5 h-3.5" />
          {shopCount} {shopCount === 1 ? 'shop' : 'shops'}
        </button>
        {brand.website && (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            Website
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Mobile Brand Header (compact) ─── */

function MobileBrandHeader({
  brand,
  logoUrl,
  beanCount,
  shopCount,
  storyText,
  onShopsClick,
}: {
  brand: Brand;
  logoUrl: string;
  beanCount: number;
  shopCount: number;
  storyText: string | null;
  onShopsClick: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-1.5">
          <Image src={logoUrl} alt={brand.name} width={44} height={44} className="object-contain w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl text-primary">{brand.name}</h3>
          <div className="flex items-center gap-3 text-xs mt-0.5">
            <span className="text-text-secondary">{beanCount} beans</span>
            <button onClick={onShopsClick} className="font-medium text-accent">
              {shopCount} {shopCount === 1 ? 'shop' : 'shops'}
            </button>
          </div>
        </div>
      </div>
      {storyText && (
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
          {storyText}
        </p>
      )}
    </div>
  );
}

/* ─── Bean Card Carousel (horizontal) ─── */

export function BeanCardStack({ beans, brandName, fadeBg }: { beans: Bean[]; brandName: string; fadeBg?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startIndex = Math.min(Math.floor(beans.length / 2), beans.length - 1);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const isAnimating = useRef(false);
  const touchStartX = useRef(0);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: number) => {
    const wrapped = ((next % beans.length) + beans.length) % beans.length;
    if (wrapped === activeIndex || isAnimating.current) return;
    isAnimating.current = true;
    setActiveIndex(wrapped);
    setTimeout(() => { isAnimating.current = false; }, 400);
  }, [beans.length, activeIndex]);

  // Auto-advance every 5s
  const resetAutoplay = useCallback(() => {
    if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    autoplayTimer.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % beans.length);
    }, 5000);
  }, [beans.length]);

  useEffect(() => {
    resetAutoplay();
    return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); };
  }, [activeIndex, resetAutoplay]);

  const manualGoTo = useCallback((next: number) => {
    resetAutoplay();
    goTo(next);
  }, [goTo, resetAutoplay]);

  // Swipe and scroll handling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 5) return;
      e.preventDefault();
      if (delta > 0) manualGoTo(activeIndex + 1);
      else manualGoTo(activeIndex - 1);
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(dx) < 30) return;
      if (dx > 0) manualGoTo(activeIndex + 1);
      else manualGoTo(activeIndex - 1);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeIndex, manualGoTo]);

  // Each card is this wide; gap between cards
  const GAP = 16;

  // Triple the beans for infinite visual looping
  const tripled = useMemo(() => [...beans, ...beans, ...beans], [beans]);
  const offsetIndex = activeIndex + beans.length; // Point to the middle copy

  return (
    <div className="relative bean-carousel" style={{ '--card-w': '260px', '--card-w-lg': '320px' } as React.CSSProperties}>
      {/* Carousel track */}
      <div ref={containerRef} className="relative overflow-hidden pb-4">
        <div
          className="flex items-start"
          style={{
            gap: GAP,
            transform: `translateX(calc(50% - var(--cw) / 2 - ${offsetIndex} * (var(--cw) + ${GAP}px)))`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          {tripled.map((bean, i) => {
            const diff = i - offsetIndex;
            const isActive = diff === 0;
            const isAdjacent = Math.abs(diff) === 1;

            return (
              <div
                key={`${bean.documentId}-${i}`}
                className="flex-shrink-0 bean-carousel-card"
                style={{
                  width: 'var(--cw)',
                  transform: isActive ? 'scale(1)' : 'scale(0.92)',
                  opacity: isActive ? 1 : isAdjacent ? 0.5 : 0.2,
                  transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.4s ease-out',
                  cursor: isActive ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (!isActive) {
                    const targetIndex = ((i - beans.length) % beans.length + beans.length) % beans.length;
                    manualGoTo(targetIndex);
                  }
                }}
              >
                <BeanUnoCard bean={bean} brandName={brandName} />
              </div>
            );
          })}
        </div>

        {/* Gradient fade edges */}
        <div
          className="absolute inset-y-0 left-0 w-12 md:w-20 pointer-events-none z-10"
          style={{
            background: `linear-gradient(to right, ${fadeBg || 'color-mix(in srgb, var(--surface-landing) 60%, var(--background))'}, transparent)`,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-12 md:w-20 pointer-events-none z-10"
          style={{
            background: `linear-gradient(to left, ${fadeBg || 'color-mix(in srgb, var(--surface-landing) 60%, var(--background))'}, transparent)`,
          }}
        />
      </div>

      {/* Navigation: arrows + dots */}
      {beans.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-5">
          <button
            onClick={() => manualGoTo(activeIndex - 1)}
            className="p-2 rounded-full transition-colors text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            {beans.map((_, i) => (
              <button
                key={i}
                onClick={() => manualGoTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'bg-primary w-4 h-1.5'
                    : 'bg-border-default hover:bg-text-secondary w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => manualGoTo(activeIndex + 1)}
            className="p-2 rounded-full transition-colors text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <style jsx>{`
        .bean-carousel {
          --cw: var(--card-w);
        }
        @media (min-width: 1024px) {
          .bean-carousel {
            --cw: var(--card-w-lg);
          }
        }
      `}</style>
    </div>
  );
}

/* ─── Bean Uno Card ─── */

export function BeanUnoCard({ bean, brandName }: { bean: Bean; brandName: string }) {
  const photoUrl = getMediaUrl(bean.photo);
  const origins = bean.origins?.filter((o) => o.name && o.code) || [];
  const flavorTags = bean.flavorTags?.filter((t) => t.name) || [];
  const roastLabel = bean.roastLevel
    ? bean.roastLevel.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const typeLabel = bean.type === 'single-origin' ? 'Single Origin' : bean.type === 'blend' ? 'Blend' : null;

  const details: { label: string; value: string }[] = [];
  if (bean.farm) details.push({ label: 'Farm', value: bean.farm });
  if (bean.region) details.push({ label: 'Region', value: bean.region });
  if (bean.altitude) details.push({ label: 'Altitude', value: `${bean.altitude}m` });
  if (bean.cuppingScore) details.push({ label: 'Score', value: `${bean.cuppingScore}` });
  if (bean.process) details.push({ label: 'Process', value: bean.process.replace(/\b\w/g, (c) => c.toUpperCase()) });
  if (bean.producer) details.push({ label: 'Producer', value: bean.producer });

  return (
    <div
      className="bg-surface rounded-xl overflow-hidden"
      style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Photo — cropped banner */}
      {photoUrl ? (
        <div className="w-full h-44 md:h-52 overflow-hidden">
          <img src={photoUrl} alt={bean.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-44 md:h-52 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
      )}

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Type + Roast badges */}
        {(typeLabel || roastLabel) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[typeLabel, roastLabel].filter(Boolean).map((label) => (
              <span
                key={label}
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Bean name */}
        <h4 className="font-display text-lg text-primary leading-snug">
          {bean.name}
        </h4>

        {/* Origins */}
        {origins.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {origins.map((origin) => (
              <CountryChip key={origin.id} code={origin.code!} name={origin.name} />
            ))}
          </div>
        )}

        {/* Description */}
        {(bean.shortDescription || bean.fullDescription) && (
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
            {bean.shortDescription || bean.fullDescription}
          </p>
        )}

        {/* Flavor tags */}
        {flavorTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {flavorTags.map((tag) => (
              <BrewMethodChip key={tag.documentId}>
                {tag.name.charAt(0).toUpperCase() + tag.name.slice(1)}
              </BrewMethodChip>
            ))}
          </div>
        )}

        {/* Detail grid */}
        {details.length > 0 && (
          <div className="grid grid-cols-3 gap-x-4 gap-y-4 pt-2 border-t border-border-default">
            {details.map((d) => (
              <div key={d.label} className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary opacity-40">{d.label}</span>
                <span className="text-sm text-primary font-medium mt-0.5">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Learn more link */}
        {bean.learnMoreUrl && (
          <a
            href={bean.learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline pt-1"
          >
            View on {brandName}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Shops Modal ─── */

function ShopsModal({
  brand,
  logoUrl,
  shopCount,
  ownShops,
  stockists,
  brandShops,
  hasMix,
  shopFilter,
  setShopFilter,
  onClose,
}: {
  brand: Brand;
  logoUrl: string;
  shopCount: number;
  ownShops: Shop[];
  stockists: Shop[];
  brandShops: Shop[];
  hasMix: boolean;
  shopFilter: 'all' | 'own' | 'stockists';
  setShopFilter: (f: 'all' | 'own' | 'stockists') => void;
  onClose: () => void;
}) {
  return (
    <ResponsiveModal isOpen onClose={onClose} size="2xl">
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-white/10 flex items-center justify-center p-1.5">
            <Image src={logoUrl} alt={brand.name} width={40} height={40} className="object-contain w-full h-full" />
          </div>
          <div>
            <h3 className="text-lg font-normal text-primary">{brand.name}</h3>
            <p className="text-sm text-text-secondary">{shopCount} {shopCount === 1 ? 'location' : 'locations'}</p>
          </div>
        </div>

        {brand.statement && (
          <p className="text-sm text-text-secondary leading-relaxed mb-5">{brand.statement}</p>
        )}

        {hasMix && (
          <div className="flex gap-2 mb-5">
            {([
              { key: 'all' as const, label: 'All', count: brandShops.length },
              { key: 'own' as const, label: 'Own stores', count: ownShops.length },
              { key: 'stockists' as const, label: 'Other stockists', count: stockists.length },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setShopFilter(tab.key)}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                  shopFilter === tab.key
                    ? 'bg-contrastBlock text-contrastText'
                    : 'bg-gray-100 dark:bg-white/10 text-text-secondary hover:text-primary'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh] divide-y divide-border-default">
          {(shopFilter === 'own' ? ownShops : shopFilter === 'stockists' ? stockists : brandShops).map((shop) => {
            const shopLogoUrl = getMediaUrl(shop.brand?.logo);
            const location = [shop.city_area?.name || shop.cityArea?.name, shop.location?.name].filter(Boolean).join(', ');
            const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
            const caption = isIndependent ? shop.brand?.statement : shop.description;
            const shopImageUrl = getMediaUrl(shop.featured_image);

            return (
              <div key={shop.documentId} className="flex items-center gap-4 py-4 first:pt-0">
                {shopLogoUrl && (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-1.5">
                    <Image src={shopLogoUrl} alt={shop.brand?.name || ''} width={48} height={48} className="object-contain w-full h-full" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{getShopDisplayName(shop)}</p>
                  {location && (
                    <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {location}
                    </p>
                  )}
                  {caption && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-1">{caption}</p>
                  )}
                </div>
                <div className="relative w-20 h-14 md:w-28 md:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
                  {shopImageUrl ? (
                    <Image src={shopImageUrl} alt={getShopDisplayName(shop)} fill className="object-cover" sizes="120px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-5 h-5 text-text-secondary opacity-30" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ResponsiveModal>
  );
}
