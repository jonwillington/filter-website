'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from './LandingPage';
import { useHomeData } from '@/lib/hooks/useDataQueries';
import { Country, Location, Shop } from '@/lib/types';
import { slugify } from '@/lib/utils';

/**
 * HomeClient handles client-side data fetching for the homepage.
 * When showLanding is true (default on /), renders the editorial LandingPage.
 * When the user picks a location or taps "Explore the map", transitions to MainLayout.
 */
export function HomeClient() {
  const { shops, countries, locations, cityAreas, events, people, newsArticles, isLoading } = useHomeData();
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
  const [isExitingMap, setIsExitingMap] = useState(false);
  const [isMapEntering, setIsMapEntering] = useState(true);
  const [triggerFindNearMe, setTriggerFindNearMe] = useState(false);
  const [landingKey, setLandingKey] = useState(0);
  const landingScrollRef = useRef(0);

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
    // Save landing scroll position before leaving
    landingScrollRef.current = window.scrollY;
    setIsTransitioning(true);
    setIsMapEntering(true);
    // Skip FirstTimeWelcome overlay since user already engaged with landing
    localStorage.setItem('filter-welcome-modal-shown', 'true');
    setTimeout(() => setShowLanding(false), 300);
  }, []);

  const handleLocationSelect = useCallback((location: Location) => {
    setInitialLocation(location);
    const countrySlug = slugify(location.country?.name ?? '');
    const citySlug = location.slug || slugify(location.name);
    window.history.pushState(null, '', `/${countrySlug}/${citySlug}`);
    transitionToMap();
  }, [transitionToMap]);

  const handleShopSelect = useCallback((shop: Shop) => {
    // Find the shop's location so MainLayout can center on it
    const location = shop.location || (shop.city_area?.location as Location);
    if (location) {
      setInitialLocation(location);
    }
    setInitialShop(shop);
    const countrySlug = slugify(location?.country?.name ?? '');
    const citySlug = location?.slug || slugify(location?.name ?? '');
    const cityArea = shop.city_area || shop.cityArea;
    const areaSlug = cityArea?.slug || (cityArea?.name ? slugify(cityArea.name) : 'all');
    const shopSlug = shop.slug || slugify(shop.name);
    window.history.pushState(null, '', `/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`);
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
    // Phase 1: Fade out MainLayout
    setIsExitingMap(true);
    window.history.pushState(null, '', '/');
    setTimeout(() => {
      // Phase 2: Switch to LandingPage, mounted at opacity-0
      setInitialLocation(null);
      setInitialShop(null);
      setTriggerFindNearMe(false);
      setIsExitingMap(false);
      setIsTransitioning(true); // Keep landing hidden on mount
      setShowLanding(true);
      setLandingKey(prev => prev + 1);
      // Phase 3: Restore scroll position and fade in LandingPage on next paint
      requestAnimationFrame(() => {
        window.scrollTo(0, landingScrollRef.current);
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      });
    }, 300);
  }, []);

  // Fade in MainLayout after it mounts
  useEffect(() => {
    if (!showLanding && isMapEntering) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMapEntering(false);
        });
      });
    }
  }, [showLanding, isMapEntering]);

  if (showLanding) {
    return (
      <LandingPage
        key={landingKey}
        locations={locations}
        shops={shops}
        countries={countries}
        events={events}
        people={people}
        newsArticles={newsArticles}
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
    <div className={`transition-opacity duration-300 ${(isExitingMap || isMapEntering) ? 'opacity-0' : 'opacity-100'}`}>
      <MainLayout
        locations={locations}
        initialLocation={initialLocation}
        shops={shops}
        initialShop={initialShop}
        countries={countries}
        cityAreas={cityAreas}
        events={events}
        people={people}
        newsArticles={newsArticles}
        visitorCountry={visitorCountry}
        isClientSideLoading={isLoading}
        triggerFindNearMe={triggerFindNearMe}
        onReturnToLanding={handleReturnToLanding}
      />
    </div>
  );
}
