'use client';

import { Button } from '@heroui/react';
import { BrandLogoCarousel, BrandLogo } from './BrandLogoCarousel';
import { Country } from '@/lib/types';

interface FirstTimeWelcomeProps {
  onFindNearMe: () => void;
  onExplore: () => void;
  brandLogos?: BrandLogo[];
  visitorCountry?: Country | null;
}

export function FirstTimeWelcome({ onFindNearMe, onExplore, brandLogos, visitorCountry }: FirstTimeWelcomeProps) {
  // Dynamic headline based on visitor's country
  const headline = visitorCountry
    ? `Bringing you ${visitorCountry.name}'s best coffee shops`
    : "Bringing you the world's best coffee shops";

  const subtitle = visitorCountry
    ? `Discover our curated selections of specialty coffee shops in ${visitorCountry.name}`
    : 'Discover our curated selections of specialty coffee shops in cities worldwide';

  return (
    <div className="flex flex-col h-full bg-surface-warm">
      {/* Brand logo carousel */}
      <BrandLogoCarousel logos={brandLogos || []} />

      {/* Content area */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {/* Editorial headline */}
        <h2
          className="font-display text-3xl leading-tight font-bold"
          style={{ color: 'var(--text)' }}
        >
          {headline}
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          {subtitle}
        </p>
      </div>

      {/* Buttons pinned to bottom */}
      <div className="px-6 pb-6 space-y-3">
        <Button
          fullWidth
          size="lg"
          onPress={onFindNearMe}
          className="bg-accent text-white font-medium"
        >
          Find near me
        </Button>

        <Button
          fullWidth
          size="lg"
          variant="bordered"
          onPress={onExplore}
          className="font-medium"
        >
          Explore
        </Button>
      </div>
    </div>
  );
}
