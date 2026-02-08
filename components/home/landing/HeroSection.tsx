'use client';

import { BrandLogoCarousel, LocationLogoGroup } from '@/components/sidebar/BrandLogoCarousel';
import { ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  headline: string;
  subtitle: string;
  locationGroups: LocationLogoGroup[];
  isLoading?: boolean;
  onExploreMap: () => void;
  onFindNearMe: () => void;
}

export function HeroSection({
  headline,
  subtitle,
  locationGroups,
  isLoading = false,
  onExploreMap,
  onFindNearMe,
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[calc(100vh-56px)] flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 text-center">
        <h1 className="font-display text-3xl md:text-5xl lg:text-7xl leading-[1.1] max-w-4xl text-contrastText">
          {headline}
        </h1>

        {isLoading ? (
          <div className="mt-6 h-5 w-80 max-w-[80%] mx-auto rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ) : (
          <p className="mt-6 text-base md:text-lg text-contrastText max-w-xl opacity-60">
            {subtitle}
          </p>
        )}

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onExploreMap}
            className="px-8 py-3.5 rounded-full bg-accent text-white font-medium text-base transition-opacity hover:opacity-90"
          >
            Explore
          </button>
          <button
            onClick={onFindNearMe}
            className="px-8 py-3.5 rounded-full border border-white/30 dark:border-black/30 text-contrastText font-medium text-base transition-opacity hover:opacity-70"
          >
            Nearby
          </button>
        </div>
      </div>

      {/* Brand logo carousel — override --surface-warm so gradient fades blend with hero bg */}
      <div className="mt-auto" style={{ '--surface-warm': 'var(--contrast-block)' } as React.CSSProperties}>
        <BrandLogoCarousel logos={[]} locationGroups={locationGroups} isLoading={isLoading} />
      </div>

      {/* Scroll indicator */}
      <div className="pb-8 flex justify-center animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/40 dark:text-black/40" />
      </div>
    </section>
  );
}
