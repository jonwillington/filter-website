'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

interface CTASectionProps {
  shopCount: number;
  cityCount: number;
  onExploreMap: () => void;
}

export function CTASection({ shopCount, cityCount, onExploreMap }: CTASectionProps) {
  const { ref, revealed } = useScrollReveal(0.3);

  return (
    <section className="px-6 py-24 md:px-12 md:py-32 text-center" style={{ background: 'var(--surface-warm)' }}>
      <div
        ref={ref}
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary max-w-2xl mx-auto mb-6 md:mb-8">
          Find your next favourite coffee shop
        </h2>

        <p className="mt-4 text-text-secondary text-base md:text-lg">
          {shopCount}+ curated shops across {cityCount} cities
        </p>

        <button
          onClick={onExploreMap}
          className="mt-8 px-10 py-3.5 rounded-full bg-accent text-white font-medium text-base transition-opacity hover:opacity-90"
        >
          Explore
        </button>
      </div>
    </section>
  );
}
