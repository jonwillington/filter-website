'use client';

interface CTASectionProps {
  shopCount: number;
  cityCount: number;
  onExploreMap: () => void;
}

export function CTASection({ shopCount, cityCount, onExploreMap }: CTASectionProps) {
  return (
    <section className="px-6 py-24 md:px-12 md:py-32 bg-background text-center">
      <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-primary max-w-lg mx-auto">
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
    </section>
  );
}
