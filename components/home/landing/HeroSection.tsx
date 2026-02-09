'use client';

import { useEffect, useState } from 'react';
import { BrandLogoCarousel, LocationLogoGroup } from '@/components/sidebar/BrandLogoCarousel';

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
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Stagger: title → subtitle → logos → buttons
    const timers = [
      setTimeout(() => setStep(1), 100),   // title
      setTimeout(() => setStep(2), 600),   // subtitle
      setTimeout(() => setStep(3), 1100),  // logos
      setTimeout(() => setStep(4), 1600),  // buttons
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const fade = (atStep: number) => ({
    opacity: step >= atStep ? 1 : 0,
    transform: step >= atStep ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
  });

  return (
    <section className="relative min-h-[calc(100vh-56px)] flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 text-center">
        <h1
          className="font-display text-3xl md:text-5xl lg:text-7xl leading-[1.1] max-w-4xl text-contrastText"
          style={fade(1)}
        >
          {headline}
        </h1>

        <p className="mt-6 text-base md:text-lg text-contrastText max-w-2xl opacity-60" style={fade(2)}>
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4" style={fade(4)}>
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

      {/* Brand logo carousel */}
      <div
        className="mt-auto pb-10 md:pb-14"
        style={{ '--surface-warm': 'var(--contrast-block)', ...fade(3) } as React.CSSProperties}
      >
        <BrandLogoCarousel logos={[]} locationGroups={locationGroups} isLoading={isLoading} />
      </div>

    </section>
  );
}
