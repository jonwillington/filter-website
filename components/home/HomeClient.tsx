'use client';

import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from './LandingPage';
import { useHomeData } from '@/lib/hooks/useDataQueries';
import { Country, Location, Shop } from '@/lib/types';

/**
 * HomeClient handles client-side data fetching for the homepage.
 * When showLanding is true (default on /), renders the editorial LandingPage.
 * When the user picks a location or taps "Explore the map", transitions to MainLayout.
 */
export function HomeClient() {
  const { shops, countries, locations, cityAreas, events, critics, isLoading } = useHomeData();
  const [visitorCountry, setVisitorCountry] = useState<Country | null>(null);

  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('landing') !== 'false';
    }
    return true;
  });
  const [initialLocation, setInitialLocation] = useState<Location | null>(null);
  const [initialShop, setInitialShop] = useState<Shop | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [triggerFindNearMe, setTriggerFindNearMe] = useState(false);
  const [landingKey, setLandingKey] = useState(0);

  // Detect visitor's country for personalized initial map position
  useEffect(() => {
    async function detectVisitorCountry() {
      try {
        const response = await fetch('/api/visitor');
        if (!response.ok) return;

        const { countryCode } = await response.json();
        if (!countryCode || countries.length === 0) return;

        const matchedCountry = countries.find(
          (c) => c.code?.toUpperCase() === countryCode.toUpperCase()
        );

        if (matchedCountry) {
          setVisitorCountry(matchedCountry);
        }
      } catch (error) {
        console.debug('Failed to detect visitor country:', error);
      }
    }

    if (countries.length > 0) {
      detectVisitorCountry();
    }
  }, [countries]);

  const transitionToMap = useCallback(() => {
    setIsTransitioning(true);
    // Skip FirstTimeWelcome overlay since user already engaged with landing
    localStorage.setItem('filter-welcome-modal-shown', 'true');
    setTimeout(() => setShowLanding(false), 300);
  }, []);

  const handleLocationSelect = useCallback((location: Location) => {
    setInitialLocation(location);
    transitionToMap();
  }, [transitionToMap]);

  const handleShopSelect = useCallback((shop: Shop) => {
    // Find the shop's location so MainLayout can center on it
    if (shop.location) {
      setInitialLocation(shop.location);
    } else if (shop.city_area?.location) {
      setInitialLocation(shop.city_area.location as Location);
    }
    setInitialShop(shop);
    transitionToMap();
  }, [transitionToMap]);

  const handleExploreMap = useCallback(() => {
    transitionToMap();
  }, [transitionToMap]);

  const handleFindNearMe = useCallback(() => {
    setTriggerFindNearMe(true);
    transitionToMap();
  }, [transitionToMap]);

  const handleReturnToLanding = useCallback(() => {
    setInitialLocation(null);
    setInitialShop(null);
    setTriggerFindNearMe(false);
    setIsTransitioning(false);
    setShowLanding(true);
    setLandingKey(prev => prev + 1);
    window.history.pushState(null, '', '/');
  }, []);

  if (showLanding) {
    return (
      <LandingPage
        key={landingKey}
        locations={locations}
        shops={shops}
        countries={countries}
        events={events}
        visitorCountry={visitorCountry}
        isLoading={isLoading}
        isTransitioning={isTransitioning}
        onLocationSelect={handleLocationSelect}
        onShopSelect={handleShopSelect}
        onExploreMap={handleExploreMap}
        onFindNearMe={handleFindNearMe}
      />
    );
  }

  return (
    <MainLayout
      locations={locations}
      initialLocation={initialLocation}
      shops={shops}
      initialShop={initialShop}
      countries={countries}
      cityAreas={cityAreas}
      events={events}
      critics={critics}
      visitorCountry={visitorCountry}
      isClientSideLoading={isLoading}
      triggerFindNearMe={triggerFindNearMe}
      onReturnToLanding={handleReturnToLanding}
    />
  );
}
