'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useHomeData } from '@/lib/hooks/useDataQueries';
import { Country } from '@/lib/types';

/**
 * HomeClient handles client-side data fetching for the homepage.
 * This enables a static shell that renders instantly, with data loaded progressively.
 */
export function HomeClient() {
  const { shops, countries, locations, cityAreas, events, isLoading } = useHomeData();
  const [visitorCountry, setVisitorCountry] = useState<Country | null>(null);

  // Detect visitor's country for personalized initial map position
  useEffect(() => {
    async function detectVisitorCountry() {
      try {
        const response = await fetch('/api/visitor');
        if (!response.ok) return;

        const { countryCode } = await response.json();
        if (!countryCode || countries.length === 0) return;

        // Find matching country from our supported countries
        const matchedCountry = countries.find(
          (c) => c.code?.toUpperCase() === countryCode.toUpperCase()
        );

        if (matchedCountry) {
          setVisitorCountry(matchedCountry);
        }
      } catch (error) {
        // Silently fail - visitor country is a nice-to-have
        console.debug('Failed to detect visitor country:', error);
      }
    }

    if (countries.length > 0) {
      detectVisitorCountry();
    }
  }, [countries]);

  return (
    <MainLayout
      locations={locations}
      initialLocation={null}
      shops={shops}
      countries={countries}
      cityAreas={cityAreas}
      events={events}
      visitorCountry={visitorCountry}
      isClientSideLoading={isLoading}
    />
  );
}
