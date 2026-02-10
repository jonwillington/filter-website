'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Shop, Brand, Bean } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDrawerTransition } from '@/lib/hooks/useDrawerTransition';
import { ResponsiveModal } from '@/components/ui';
import { ExternalLink, MapPin, Store } from 'lucide-react';

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

    const top = Array.from(brandMap.values())
      .filter((r) => r.beans.length >= 3)
      .sort((a, b) => b.beans.length - a.beans.length)
      .slice(0, 3);

    const roasterIds = new Set(top.map((r) => r.brand.documentId));

    const suppliedShops = new Map<string, Shop[]>();
    top.forEach((r) => suppliedShops.set(r.brand.documentId, []));

    for (const shop of shops) {
      const suppliers = shop.brand?.suppliers;
      if (!suppliers?.length) continue;
      for (const supplier of suppliers) {
        if (supplier.documentId && roasterIds.has(supplier.documentId)) {
          suppliedShops.get(supplier.documentId)!.push(shop);
        }
      }
    }

    return top.map((r) => {
      const ownShopList = shops.filter((s) => r.ownShops.has(s.documentId));
      const supplied = suppliedShops.get(r.brand.documentId) || [];
      const seen = new Set(ownShopList.map((s) => s.documentId));
      const allShops = [...ownShopList];
      for (const s of supplied) {
        if (!seen.has(s.documentId)) {
          seen.add(s.documentId);
          allShops.push(s);
        }
      }

      return {
        brand: r.brand,
        beans: r.beans,
        logoUrl: getMediaUrl(r.brand.logo)!,
        shopCount: allShops.length,
        ownShops: ownShopList,
        stockists: supplied,
        brandShops: allShops,
      };
    });
  }, [shops]);

  if (topRoasters.length === 0) return null;

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

      <div ref={gridRef} className="flex flex-col gap-8 lg:gap-10">
        {topRoasters.map((roaster, i) => (
          <RoasterBlock
            key={roaster.brand.documentId}
            roaster={roaster}
            index={i}
            revealed={gridRevealed}
          />
        ))}
      </div>
    </section>
  );
}

/** Pick the bean with the richest data for default selection */
function pickBestBean(beans: Bean[]): number {
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < beans.length; i++) {
    const b = beans[i];
    let score = 0;
    if (getMediaUrl(b.photo)) score += 5;
    if (b.type === 'single-origin') score += 3;
    if (b.fullDescription) score += 2;
    if (b.shortDescription) score += 1;
    if (b.roastLevel) score += 1;
    if (b.process) score += 1;
    if (b.altitude) score += 1;
    if (b.farm) score += 1;
    if (b.region) score += 1;
    if (b.producer) score += 1;
    if (b.cuppingScore) score += 2;
    score += (b.flavorTags?.length || 0) * 0.5;
    score += (b.origins?.length || 0) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function RoasterBlock({
  roaster,
  index,
  revealed,
}: {
  roaster: RoasterInfo;
  index: number;
  revealed: boolean;
}) {
  const { brand, beans, logoUrl, shopCount, ownShops, stockists, brandShops } = roaster;
  const [shopsModalOpen, setShopsModalOpen] = useState(false);
  const [shopFilter, setShopFilter] = useState<'all' | 'own' | 'stockists'>('all');
  const hasMix = ownShops.length > 0 && stockists.length > 0;
  const [beanFilter, setBeanFilter] = useState<'all' | 'single-origin' | 'blend'>('all');

  const filteredBeans = useMemo(() => {
    if (beanFilter === 'all') return beans;
    return beans.filter((b) => b.type === beanFilter);
  }, [beans, beanFilter]);

  const hasSingleOrigin = beans.some((b) => b.type === 'single-origin');
  const hasBlend = beans.some((b) => b.type === 'blend');
  const showBeanFilters = hasSingleOrigin && hasBlend;

  const defaultIdx = useMemo(() => pickBestBean(beans), [beans]);
  const [selectedBeanId, setSelectedBeanId] = useState<string>(beans[defaultIdx]?.documentId ?? '');
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const selectedBean = useMemo(
    () => beans.find((b) => b.documentId === selectedBeanId) ?? beans[defaultIdx] ?? beans[0],
    [beans, selectedBeanId, defaultIdx],
  );

  const { displayedItem: displayedBean, isTransitioning } = useDrawerTransition({
    item: selectedBean,
    getKey: (b) => b?.documentId ?? '',
    scrollRef: detailScrollRef,
  });

  const story = brand.statement || brand.story;
  const storyText = story
    ? story.length > 200
      ? story.slice(0, 200).replace(/\s+\S*$/, '') + '...'
      : story
    : null;

  return (
    <>
      <div
        className="bg-surface rounded-2xl border border-border-default overflow-hidden"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(24px)',
          transition: `opacity 0.7s ease-out ${index * 0.15}s, transform 0.7s ease-out ${index * 0.15}s`,
        }}
      >
        {/* Mobile: brand header + horizontal bean chips */}
        <div className="lg:hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-1.5">
                <Image src={logoUrl} alt={brand.name} width={40} height={40} className="object-contain w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg text-primary">{brand.name}</h3>
                <div className="flex items-center gap-3 text-xs mt-0.5">
                  <span className="text-text-secondary">{beans.length} beans</span>
                  <button onClick={() => setShopsModalOpen(true)} className="font-medium text-accent">
                    {shopCount} {shopCount === 1 ? 'shop' : 'shops'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 px-5 scrollbar-hide">
            {beans.map((bean) => {
              const isSelected = bean.documentId === selectedBeanId;
              const thumbUrl = getMediaUrl(bean.photo);
              return (
                <button
                  key={bean.documentId}
                  onClick={() => setSelectedBeanId(bean.documentId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 transition-colors duration-200 border ${
                    isSelected
                      ? 'border-border-default bg-gray-50 dark:bg-white/[0.06]'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  {thumbUrl ? (
                    <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0">
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-md flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/40" />
                  )}
                  <span className="text-xs font-medium text-primary whitespace-nowrap max-w-[120px] truncate">
                    {bean.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT: Brand identity + bean list (desktop) */}
          <div className="hidden lg:flex lg:flex-col lg:col-span-5 border-r border-border-default">
            {/* Brand header */}
            <div className="px-5 pt-5 pb-4 border-b border-border-default">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-2">
                  <Image src={logoUrl} alt={brand.name} width={48} height={48} className="object-contain w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-2xl xl:text-3xl text-primary leading-none">
                    {brand.name}
                  </h3>
                  <p className="text-xs font-mono uppercase tracking-wider text-text-secondary opacity-50 mt-1.5">
                    {beans.length} beans
                  </p>
                </div>
              </div>
              {storyText && (
                <p className="text-sm text-text-secondary mt-3 leading-relaxed line-clamp-2">
                  {storyText}
                </p>
              )}
              {/* Shop & website links */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                <button
                  onClick={() => setShopsModalOpen(true)}
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

            {/* Bean filter chips */}
            {showBeanFilters && (
              <div className="flex gap-1.5 px-5 py-3 border-b border-border-default">
                {([
                  { key: 'all' as const, label: 'All', count: beans.length },
                  { key: 'single-origin' as const, label: 'Single Origin', count: beans.filter((b) => b.type === 'single-origin').length },
                  { key: 'blend' as const, label: 'Blends', count: beans.filter((b) => b.type === 'blend').length },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setBeanFilter(tab.key)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      beanFilter === tab.key
                        ? 'bg-contrastBlock text-contrastText'
                        : 'bg-gray-100 dark:bg-white/10 text-text-secondary hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Bean list */}
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {filteredBeans.map((bean, i) => {
                const isSelected = bean.documentId === selectedBeanId;
                const thumbUrl = getMediaUrl(bean.photo);
                const beanRoast = bean.roastLevel
                  ? bean.roastLevel.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  : null;
                const beanType = bean.type === 'single-origin' ? 'Single Origin' : bean.type === 'blend' ? 'Blend' : null;
                const beanMeta = [beanType, beanRoast].filter(Boolean).join(' \u00b7 ');

                return (
                  <button
                    key={bean.documentId}
                    onClick={() => setSelectedBeanId(bean.documentId)}
                    className={`w-full text-left flex gap-3 px-5 py-3 transition-colors duration-200 ${
                      isSelected
                        ? 'bg-gray-50 dark:bg-white/[0.04]'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    } ${i < filteredBeans.length - 1 ? 'border-b border-border-default' : ''}`}
                  >
                    {thumbUrl ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5">
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {bean.name}
                      </p>
                      {beanMeta && (
                        <p className="text-[11px] text-text-secondary mt-0.5 opacity-60">
                          {beanMeta}
                        </p>
                      )}
                    </div>
                    {bean.origins && bean.origins.length > 0 && bean.origins[0].code && (
                      <img
                        src={`https://flagcdn.com/w40/${bean.origins[0].code.toLowerCase()}.png`}
                        alt=""
                        className="w-5 h-3.5 rounded-sm flex-shrink-0 mt-1 opacity-50"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Bean detail panel with crossfade */}
          <div className="lg:col-span-7" ref={detailScrollRef}>
            <div
              className="transition-opacity duration-200 ease-in-out"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              <BeanDetailPanel bean={displayedBean} brandName={brand.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Shops modal */}
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
    </>
  );
}

/** Detail panel for the selected bean — right side of master-detail */
function BeanDetailPanel({ bean, brandName }: { bean: Bean; brandName: string }) {
  const photoUrl = getMediaUrl(bean.photo);
  const origins = bean.origins?.filter((o) => o.name && o.code) || [];
  const flavorTags = bean.flavorTags?.filter((t) => t.name) || [];
  const roastLabel = bean.roastLevel
    ? bean.roastLevel.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const processLabel = bean.process
    ? bean.process.replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const typeLabel = bean.type === 'single-origin' ? 'Single Origin' : bean.type === 'blend' ? 'Blend' : null;
  const metaBadges = [typeLabel, roastLabel, processLabel].filter(Boolean);

  const details: { label: string; value: string }[] = [];
  if (bean.farm) details.push({ label: 'Farm', value: bean.farm });
  if (bean.region) details.push({ label: 'Region', value: bean.region });
  if (bean.producer) details.push({ label: 'Producer', value: bean.producer });
  if (bean.altitude) details.push({ label: 'Altitude', value: `${bean.altitude}m` });
  if (bean.cuppingScore) details.push({ label: 'Score', value: `${bean.cuppingScore}` });

  return (
    <div className="p-5 md:p-6 space-y-4">
      {/* Top row: square photo + name/meta */}
      <div className="flex gap-4">
        {photoUrl ? (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
            <img src={photoUrl} alt={bean.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
        )}

        <div className="flex-1 min-w-0 space-y-2">
          {/* Meta badges */}
          {metaBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {metaBadges.map((label) => (
                <span
                  key={label}
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-text-secondary"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Name */}
          <h3 className="font-display text-xl md:text-2xl text-primary leading-tight">
            {bean.name}
          </h3>

          {/* Origins */}
          {origins.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {origins.map((origin) => (
                <span key={origin.id} className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                  <img src={`https://flagcdn.com/w40/${origin.code!.toLowerCase()}.png`} alt={origin.name} className="w-4 h-3 rounded-sm" />
                  {origin.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {(bean.fullDescription || bean.shortDescription) && (
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
          {bean.fullDescription || bean.shortDescription}
        </p>
      )}

      {/* Vertically stacked detail properties + flavor tags */}
      {(details.length > 0 || flavorTags.length > 0) && (
        <div className="pt-3 border-t border-border-default space-y-3">
          {details.length > 0 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {details.map((d) => (
                <div key={d.label} className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary opacity-40">{d.label}</span>
                  <span className="text-sm text-primary font-medium mt-0.5">{d.value}</span>
                </div>
              ))}
            </div>
          )}
          {flavorTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {flavorTags.map((tag) => (
                <span key={tag.documentId} className="text-xs px-2 py-0.5 rounded-full border border-border-default text-text-secondary">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learn more */}
      {bean.learnMoreUrl && (
        <a
          href={bean.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          View on {brandName}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

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
            const shopImageUrl = getMediaUrl(shop.featured_image);
            const shopLogoUrl = getMediaUrl(shop.brand?.logo);
            const location = [shop.city_area?.name || shop.cityArea?.name, shop.location?.name].filter(Boolean).join(', ');
            const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
            const caption = isIndependent ? shop.brand?.statement : shop.description;

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
