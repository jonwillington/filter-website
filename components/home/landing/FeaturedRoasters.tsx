'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Shop, Brand, Bean } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ResponsiveModal } from '@/components/ui';
import { ExternalLink, MapPin, Store } from 'lucide-react';
import { BeanCard } from './BeanCard';

const BEANS_PER_PAGE = 6;

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

    // First pass: collect roasters and their own-brand shops
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

    // Select top 3 roasters
    const top = Array.from(brandMap.values())
      .filter((r) => r.beans.length >= 3)
      .sort((a, b) => b.beans.length - a.beans.length)
      .slice(0, 3);

    // Collect roaster documentIds for supplier lookup
    const roasterIds = new Set(top.map((r) => r.brand.documentId));

    // Second pass: find shops supplied by these roasters
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
      // Merge own + supplied, dedup by documentId
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
  const [visibleCount, setVisibleCount] = useState(BEANS_PER_PAGE);
  const [shopsModalOpen, setShopsModalOpen] = useState(false);
  const [shopFilter, setShopFilter] = useState<'all' | 'own' | 'stockists'>('all');
  const hasMix = ownShops.length > 0 && stockists.length > 0;

  const story = brand.statement || brand.story;
  const storyText = story
    ? story.length > 200
      ? story.slice(0, 200).replace(/\s+\S*$/, '') + '...'
      : story
    : null;

  const visibleBeans = beans.slice(0, visibleCount);
  const remainingCount = beans.length - visibleCount;
  const hasMore = remainingCount > 0;

  return (
    <>
      <div
        className="bg-surface-warm rounded-2xl p-6 md:p-8 lg:p-10"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(24px)',
          transition: `opacity 0.7s ease-out ${index * 0.15}s, transform 0.7s ease-out ${index * 0.15}s`,
        }}
      >
        {/* Horizontal split layout */}
        <div className="flex flex-col lg:flex-row lg:gap-0">
          {/* Left column: brand info (1/3 on desktop) */}
          <div className="lg:w-1/3 lg:pr-8 lg:border-r border-border-default flex flex-col mb-6 lg:mb-0">
            {/* Brand header */}
            <div className="flex items-start gap-4 md:gap-5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-2.5">
                <Image
                  src={logoUrl}
                  alt={brand.name}
                  width={64}
                  height={64}
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-display text-2xl md:text-3xl text-primary">
                  {brand.name}
                </h3>
              </div>
            </div>

            {storyText && (
              <p className="text-sm md:text-base text-text-secondary mt-4 leading-relaxed">
                {storyText}
              </p>
            )}

            {/* Footer actions — pushed to bottom on desktop */}
            <div className="mt-auto pt-5 flex flex-col gap-2 text-sm">
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((c) => c + BEANS_PER_PAGE)}
                  className="font-medium text-accent hover:underline text-left"
                >
                  View {remainingCount} more beans
                </button>
              )}
              <button
                onClick={() => setShopsModalOpen(true)}
                className="font-medium text-accent hover:underline text-left"
              >
                {shopCount} {shopCount === 1 ? 'shop' : 'shops'} stocking their coffee
              </button>
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                >
                  Learn more about {brand.name}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Right column: bean cards grid (2/3 on desktop) */}
          <div className="lg:w-2/3 lg:pl-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleBeans.map((bean) => (
                <BeanCard key={bean.documentId} bean={bean} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shops modal */}
      {shopsModalOpen && (
        <ResponsiveModal
          isOpen={shopsModalOpen}
          onClose={() => setShopsModalOpen(false)}
          size="2xl"
        >
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-white/10 flex items-center justify-center p-1.5">
                <Image
                  src={logoUrl}
                  alt={brand.name}
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                />
              </div>
              <div>
                <h3 className="text-lg font-normal text-primary">{brand.name}</h3>
                <p className="text-sm text-text-secondary">{shopCount} {shopCount === 1 ? 'location' : 'locations'}</p>
              </div>
            </div>

            {brand.statement && (
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                {brand.statement}
              </p>
            )}

            {/* Filter tabs — only shown when there's a mix */}
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

            {/* Shop list */}
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-border-default">
              {(shopFilter === 'own' ? ownShops : shopFilter === 'stockists' ? stockists : brandShops).map((shop) => {
                const shopImageUrl = getMediaUrl(shop.featured_image);
                const shopLogoUrl = getMediaUrl(shop.brand?.logo);
                const location = [shop.city_area?.name || shop.cityArea?.name, shop.location?.name].filter(Boolean).join(', ');
                const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
                const caption = isIndependent ? shop.brand?.statement : shop.description;

                return (
                  <div key={shop.documentId} className="flex items-center gap-4 py-4 first:pt-0">
                    {/* Brand logo */}
                    {shopLogoUrl && (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white dark:bg-white/10 flex-shrink-0 flex items-center justify-center p-1.5">
                        <Image
                          src={shopLogoUrl}
                          alt={shop.brand?.name || ''}
                          width={48}
                          height={48}
                          className="object-contain w-full h-full"
                        />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary">{getShopDisplayName(shop)}</p>
                      {location && (
                        <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {location}
                        </p>
                      )}
                      {caption && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                          {caption}
                        </p>
                      )}
                    </div>

                    {/* Shop image */}
                    <div className="relative w-20 h-14 md:w-28 md:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
                      {shopImageUrl ? (
                        <Image
                          src={shopImageUrl}
                          alt={getShopDisplayName(shop)}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
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
      )}
    </>
  );
}
