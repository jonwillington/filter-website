'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Shop, Brand, Bean } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ResponsiveModal } from '@/components/ui';
import { ExternalLink, MapPin, Store } from 'lucide-react';

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
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default" style={{ background: 'var(--surface-landing)' }}>
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Beans from top roasters
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
        {/* Brand header */}
        <div className="flex items-start gap-4 md:gap-6 mb-6 md:mb-8">
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
            {storyText && (
              <p className="text-sm md:text-base text-text-secondary mt-2 leading-relaxed">
                {storyText}
              </p>
            )}
          </div>
        </div>

        {/* Bean cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleBeans.map((bean) => (
            <BeanCard key={bean.documentId} bean={bean} />
          ))}
        </div>

        {/* Footer row */}
        <div className="mt-5 md:mt-6 pt-5 border-t border-border-default flex flex-wrap items-center gap-x-1 gap-y-2">
          {/* Left actions */}
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {hasMore && (
              <>
                <button
                  onClick={() => setVisibleCount((c) => c + BEANS_PER_PAGE)}
                  className="font-medium text-accent hover:underline"
                >
                  View {remainingCount} more
                </button>
                <span className="text-text-secondary">&middot;</span>
              </>
            )}
            <button
              onClick={() => setShopsModalOpen(true)}
              className="font-medium text-accent hover:underline"
            >
              {shopCount} {shopCount === 1 ? 'shop' : 'shops'} stocking their coffee
            </button>
          </div>

          {/* Right: Learn more */}
          {brand.website && (
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Learn more about {brand.name}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
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

function BeanCard({ bean }: { bean: Bean }) {
  const origins = bean.origins?.filter((o) => o.name && o.code) || [];
  const roastLabel = bean.roastLevel
    ? bean.roastLevel.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const processLabel = bean.process
    ? bean.process.replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const photoUrl = getMediaUrl(bean.photo);

  const meta = [
    bean.type === 'single-origin' ? 'Single Origin' : bean.type === 'blend' ? 'Blend' : null,
    roastLabel,
    processLabel,
  ].filter(Boolean).join(' · ');

  const card = (
    <div className="flex gap-3 rounded-xl bg-background h-full overflow-hidden">
      {/* Square thumbnail */}
      {photoUrl ? (
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <img src={photoUrl} alt={bean.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
      )}

      {/* Details */}
      <div className="py-1.5 pb-3 pr-2 flex-1 min-w-0 flex flex-col">
        <h4 className="font-medium text-primary text-sm line-clamp-1">
          {bean.name}
        </h4>

        {meta && (
          <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">
            {meta}
          </p>
        )}

        {bean.shortDescription && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-1 leading-relaxed">
            {bean.shortDescription}
          </p>
        )}

        {origins.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {origins.map((origin) => (
              <span
                key={origin.id}
                className="inline-flex items-center gap-1 text-[11px] text-text-secondary px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10"
              >
                <img
                  src={`https://flagcdn.com/w40/${origin.code!.toLowerCase()}.png`}
                  alt={origin.name}
                  className="w-3 h-3 rounded-full"
                />
                {origin.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (bean.learnMoreUrl) {
    return (
      <a
        href={bean.learnMoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {card}
      </a>
    );
  }

  return card;
}
