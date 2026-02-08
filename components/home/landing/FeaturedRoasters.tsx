'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Shop, Brand } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Coffee } from 'lucide-react';

interface RoasterInfo {
  brand: Brand;
  beanCount: number;
  logoUrl: string;
  cityName?: string;
}

interface FeaturedRoastersProps {
  shops: Shop[];
}

export function FeaturedRoasters({ shops }: FeaturedRoastersProps) {
  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: gridRef, revealed: gridRevealed } = useScrollReveal(0.05);

  // Derive top roasters from shop brands by bean count
  const topRoasters = useMemo<RoasterInfo[]>(() => {
    const brandMap = new Map<string, { brand: Brand; beanCount: number; cityName?: string }>();

    for (const shop of shops) {
      const brand = shop.brand;
      if (!brand?.documentId || !brand.roastOwnBeans) continue;

      const beans = brand.beans || [];
      const existing = brandMap.get(brand.documentId);

      if (!existing || beans.length > existing.beanCount) {
        const logoUrl = getMediaUrl(brand.logo);
        if (!logoUrl) continue;

        brandMap.set(brand.documentId, {
          brand,
          beanCount: beans.length,
          cityName: shop.location?.name,
        });
      }
    }

    return Array.from(brandMap.values())
      .filter((r) => r.beanCount > 0)
      .sort((a, b) => b.beanCount - a.beanCount)
      .slice(0, 12)
      .map((r) => ({
        brand: r.brand,
        beanCount: r.beanCount,
        logoUrl: getMediaUrl(r.brand.logo)!,
        cityName: r.cityName,
      }));
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
        Top roasters
      </h2>

      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
        {topRoasters.map((roaster, i) => (
          <RoasterCard
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

function RoasterCard({
  roaster,
  index,
  revealed,
}: {
  roaster: RoasterInfo;
  index: number;
  revealed: boolean;
}) {
  const { brand, beanCount, logoUrl, cityName } = roaster;

  return (
    <div
      className="group"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease-out ${index * 0.06}s, transform 0.6s ease-out ${index * 0.06}s`,
      }}
    >
      {/* Logo */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white dark:bg-white/5 border border-border-default flex items-center justify-center p-6 group-hover:border-accent transition-colors">
        <Image
          src={logoUrl}
          alt={brand.name}
          width={160}
          height={160}
          className="object-contain w-full h-full"
        />
      </div>

      {/* Info */}
      <div className="mt-3">
        <h3 className="text-base font-medium text-primary line-clamp-1 group-hover:text-accent transition-colors">
          {brand.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-text-secondary">
          <Coffee className="w-3.5 h-3.5" />
          <span>{beanCount} {beanCount === 1 ? 'bean' : 'beans'}</span>
        </div>
        {brand.statement && (
          <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{brand.statement}</p>
        )}
      </div>
    </div>
  );
}
