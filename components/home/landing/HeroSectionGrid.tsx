'use client';

import { useEffect, useState } from 'react';
import { PerspectiveImageGrid, type LocationImageGroup } from './PerspectiveImageGrid';

interface HeroSectionGridProps {
  headline: string;
  subtitle: string;
  imageGroups: LocationImageGroup[];
  isLoading?: boolean;
  onExploreMap: () => void;
  onFindNearMe: () => void;
}

export function HeroSectionGrid({
  headline,
  subtitle,
  imageGroups,
  isLoading = false,
  onExploreMap,
  onFindNearMe,
}: HeroSectionGridProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 100),
      setTimeout(() => setStep(2), 600),
      setTimeout(() => setStep(3), 1100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const fade = (atStep: number) => ({
    opacity: step >= atStep ? 1 : 0,
    transform: step >= atStep ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
  });

  return (
    <section className="relative min-h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      {/* Layer 1: Perspective image grid (z-0) */}
      <PerspectiveImageGrid imageGroups={imageGroups} />

      {/* Layer 2: Edge fade gradients (z-10) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to bottom, var(--contrast-block) 20%, transparent)' }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48"
          style={{ background: 'linear-gradient(to top, var(--contrast-block) 20%, transparent)' }}
        />
        {/* Left fade */}
        <div
          className="absolute top-0 bottom-0 left-0 w-32"
          style={{ background: 'linear-gradient(to right, var(--contrast-block), transparent)' }}
        />
        {/* Right fade */}
        <div
          className="absolute top-0 bottom-0 right-0 w-32"
          style={{ background: 'linear-gradient(to left, var(--contrast-block), transparent)' }}
        />
      </div>

      {/* Layer 3: Center radial wash for text readability (z-20) */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at center 45%, var(--contrast-block) 0%, transparent 100%)',
          opacity: 0.92,
        }}
      />

      {/* Layer 4: Text content (z-30) */}
      <div className="relative z-30 flex-1 flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 text-center">
        <h1
          className="font-display text-3xl md:text-5xl lg:text-7xl leading-[1.1] max-w-4xl text-contrastText"
          style={fade(1)}
        >
          {headline}
        </h1>

        <p className="mt-6 text-base md:text-lg text-contrastText max-w-2xl opacity-60" style={fade(2)}>
          {subtitle}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4" style={fade(3)}>
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
    </section>
  );
}
