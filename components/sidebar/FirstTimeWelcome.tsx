'use client';

import { Button } from '@heroui/react';
import { BrandLogoCarousel, BrandLogo } from './BrandLogoCarousel';

interface FirstTimeWelcomeProps {
  onFindNearMe: () => void;
  onExplore: () => void;
  brandLogos?: BrandLogo[];
}

export function FirstTimeWelcome({ onFindNearMe, onExplore, brandLogos }: FirstTimeWelcomeProps) {
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
          Bringing you the world&apos;s best coffee shops
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          Discover our curated selections of specialty coffee shops in cities worldwide
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
