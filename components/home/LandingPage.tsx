'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Location, Shop, Country, Event, Person, NewsArticle } from '@/lib/types';
import { getMediaUrl, hasCityAreaRecommendation } from '@/lib/utils';
import { BrandLogo, LocationLogoGroup } from '@/components/sidebar/BrandLogoCarousel';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from './landing/HeroSection';
import { FeaturedCities } from './landing/FeaturedCities';
import { FeaturedShops } from './landing/FeaturedShops';
import { FeaturedEvents } from './landing/FeaturedEvents';
import { FeaturedRoasters } from './landing/FeaturedRoasters';
import { InFocusSection } from './landing/InFocusSection';
import { CriticsPicks } from './landing/CriticsPicks';
import { LatestNews } from './landing/LatestNews';
import { CTASection } from './landing/CTASection';
import { useAuth } from '@/lib/context/AuthContext';
import { Search, LogIn } from 'lucide-react';
import { Button } from '@heroui/react';
import { UserMenu } from '@/components/auth/UserMenu';

const SearchModal = dynamic(
  () => import('@/components/modals/SearchModal').then(mod => ({ default: mod.SearchModal })),
  { ssr: false }
);
const LoginModal = dynamic(
  () => import('@/components/auth/LoginModal').then(mod => ({ default: mod.LoginModal })),
  { ssr: false }
);

const ExploreModal = dynamic(
  () => import('@/components/modals/ExploreModal').then(mod => ({ default: mod.ExploreModal })),
  { ssr: false }
);

interface LandingPageProps {
  locations: Location[];
  shops: Shop[];
  countries?: Country[];
  events?: Event[];
  people?: Person[];
  newsArticles?: NewsArticle[];
  visitorCountry?: Country | null;
  isLoading?: boolean;
  isTransitioning: boolean;
  onLocationSelect: (location: Location) => void;
  onShopSelect: (shop: Shop) => void;
  onExploreMap: () => void;
  onFindNearMe: () => void;
}

export function LandingPage({
  locations,
  shops,
  countries = [],
  events = [],
  people = [],
  newsArticles = [],
  visitorCountry,
  isLoading = false,
  isTransitioning,
  onLocationSelect,
  onShopSelect,
  onExploreMap,
  onFindNearMe,
}: LandingPageProps) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [headerLight, setHeaderLight] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();

  // Unlock scroll when landing page is active
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => {
      document.documentElement.classList.remove('landing-active');
    };
  }, []);

  // Invert header to light when scrolled past hero
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When hero is no longer intersecting (scrolled past), switch to light header
        setHeaderLight(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' } // Account for header height
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Headline personalized by visitor country
  const headline = visitorCountry
    ? `Discover ${visitorCountry.name}'s best specialty coffee`
    : "Discover the world's best specialty coffee";

  const uniqueCountryCount = useMemo(() => {
    const codes = new Set<string>();
    for (const loc of locations) {
      if (loc.country?.code) codes.add(loc.country.code);
    }
    return codes.size;
  }, [locations]);

  const subtitle = `Curated guides to specialty coffee shops in ${locations.length} cities across ${uniqueCountryCount} countries`;

  // Group brand logos by location for the carousel
  const locationGroups = useMemo<LocationLogoGroup[]>(() => {
    const groupMap = new Map<string, { locationName: string; countryCode?: string; primaryColor?: string; seen: Set<string>; logos: BrandLogo[] }>();

    for (const shop of shops) {
      const locName = shop.location?.name;
      if (!locName || !shop.brand?.documentId || !shop.brand.logo) continue;

      const logoUrl = getMediaUrl(shop.brand.logo);
      if (!logoUrl) continue;

      if (!groupMap.has(locName)) {
        groupMap.set(locName, {
          locationName: locName,
          countryCode: shop.location?.country?.code,
          primaryColor: shop.location?.country?.primaryColor || undefined,
          seen: new Set(),
          logos: [],
        });
      }

      const group = groupMap.get(locName)!;
      if (group.seen.has(shop.brand.documentId)) continue;
      group.seen.add(shop.brand.documentId);
      group.logos.push({ name: shop.brand.name, logoUrl });
    }

    // Sort by number of brands descending, take locations with at least 2 brands
    return Array.from(groupMap.values())
      .filter(g => g.logos.length >= 4)
      .sort((a, b) => b.logos.length - a.logos.length)
      .map(({ locationName, countryCode, primaryColor, logos }) => ({ locationName, countryCode, primaryColor, logos }));
  }, [shops]);

  // Featured cities: has background_image AND rating_stars >= 3.5, sorted by rating desc, take 8
  const featuredCities = useMemo(() => {
    return locations
      .filter((loc) => loc.background_image && loc.rating_stars && loc.rating_stars >= 3.5)
      .sort((a, b) => (b.rating_stars || 0) - (a.rating_stars || 0))
      .slice(0, 8);
  }, [locations]);

  // Featured shops: cityAreaRec recommended, prefer those with featured_image
  const featuredShops = useMemo(() => {
    const candidates = shops.filter(
      (shop) => hasCityAreaRecommendation(shop)
    );

    // Sort: shops with featured_image first, then by rating
    return candidates.sort((a, b) => {
      const aHasImage = a.featured_image ? 1 : 0;
      const bHasImage = b.featured_image ? 1 : 0;
      if (bHasImage !== aHasImage) return bHasImage - aHasImage;
      return (b.google_rating || 0) - (a.google_rating || 0);
    });
  }, [shops]);

  // Future events sorted by date (soonest first)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 6);
  }, [events]);

  // Build country code → region name lookup from countries data
  const countryRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countries) {
      if (c.code && c.region?.Name) {
        map.set(c.code.toUpperCase(), c.region.Name);
      }
    }
    return map;
  }, [countries]);

  // In Focus: hardcoded to PAGA Microroastery for now
  const inFocusShop = useMemo(() => {
    return shops.find((s) => s.name?.toLowerCase().includes('paga')) || null;
  }, [shops]);

  const handleExploreLocationSelect = useCallback((location: Location) => {
    setExploreOpen(false);
    onLocationSelect(location);
  }, [onLocationSelect]);

  return (
    <div
      className={`min-h-screen transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Header — dark on hero, light after scrolling past */}
      <div className={`top-bar ${headerLight ? 'landing-top-bar-light' : 'landing-top-bar'}`} style={{ transition: 'background 0.3s ease, border-color 0.3s ease' }}>
        <div className="top-bar-content">
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">Filter</span>
            <button
              onClick={() => setExploreOpen(true)}
              className="text-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              Explore cities
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              isIconOnly
              variant="flat"
              radius="full"
              onPress={() => setSearchOpen(true)}
              size="sm"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Button>
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
            ) : user ? (
              <UserMenu onOpenSettings={() => {}} />
            ) : (
              <Button
                isIconOnly
                variant="flat"
                radius="full"
                onPress={() => setLoginOpen(true)}
                size="sm"
                aria-label="Sign in"
              >
                <LogIn className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero on contrastBlock bg */}
      <div ref={heroRef} className="bg-contrastBlock pt-14">
        <HeroSection
          headline={headline}
          subtitle={subtitle}
          locationGroups={locationGroups}
          isLoading={isLoading}
          onExploreMap={() => setExploreOpen(true)}
          onFindNearMe={onFindNearMe}
        />
      </div>

      <FeaturedCities cities={featuredCities} onCitySelect={onLocationSelect} />

      <FeaturedShops shops={featuredShops} countryRegionMap={countryRegionMap} onShopSelect={onShopSelect} />

      <FeaturedRoasters shops={shops} />

      <CriticsPicks people={people} shops={shops} onShopSelect={onShopSelect} />

      {inFocusShop && (
        <InFocusSection shop={inFocusShop} onShopSelect={onShopSelect} />
      )}

      <FeaturedEvents events={upcomingEvents} />

      <LatestNews articles={newsArticles} onShopSelect={onShopSelect} />

      <CTASection
        shopCount={shops.length}
        cityCount={locations.length}
        onExploreMap={() => setExploreOpen(true)}
      />

      {/* Reuse the fixed footer */}
      <Footer />

      {/* Explore modal */}
      {exploreOpen && (
        <ExploreModal
          isOpen={exploreOpen}
          onClose={() => setExploreOpen(false)}
          locations={locations}
          countries={countries}
          allShops={shops}
          events={events}
          onLocationSelect={handleExploreLocationSelect}
        />
      )}

      {/* Search modal */}
      {searchOpen && (
        <SearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          locations={locations}
          shops={shops}
        />
      )}

      {/* Login modal */}
      {loginOpen && (
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
        />
      )}
    </div>
  );
}
