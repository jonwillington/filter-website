'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Location, Shop, Country, Event, Person, NewsArticle } from '@/lib/types';
import { getMediaUrl, hasCityAreaRecommendation, getShopCoordinates } from '@/lib/utils';
import { BrandLogo, LocationLogoGroup } from '@/components/sidebar/BrandLogoCarousel';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from './landing/HeroSection';
import { HeroSectionGrid } from './landing/HeroSectionGrid';
import { LocationImageGroup, GridTile } from './landing/PerspectiveImageGrid';
import { FeaturedCities } from './landing/FeaturedCities';
import { FeaturedShops } from './landing/FeaturedShops';
import { FeaturedEvents } from './landing/FeaturedEvents';
import { FeaturedRoasters } from './landing/FeaturedRoasters';
import { InFocusSection } from './landing/InFocusSection';
import { CriticsPicks } from './landing/CriticsPicks';
import { LatestNews } from './landing/LatestNews';
import { CoffeeAroundWorld } from './landing/CoffeeAroundWorld';
import { useAuth } from '@/lib/context/AuthContext';
import { Search, LogIn, Sun, Moon } from 'lucide-react';
import { Button } from '@heroui/react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useTheme } from '@/lib/context/ThemeContext';

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
  const [heroVariant, setHeroVariant] = useState<'logos' | 'grid'>('logos');
  const [exploreOpen, setExploreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [headerLight, setHeaderLight] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const { effectiveTheme, setThemeMode } = useTheme();

  // Read hero variant from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hero') === 'grid') setHeroVariant('grid');
  }, []);

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

  // Group shop photos by location for the grid hero variant
  const imageGroups = useMemo<LocationImageGroup[]>(() => {
    const groupMap = new Map<string, {
      locationName: string;
      countryCode?: string;
      tiles: GridTile[];
      brandLogos: string[];
      brandSeen: Set<string>;
      shopCoords: [number, number][];
      shopCount: number;
    }>();

    for (const shop of shops) {
      const locName = shop.location?.name;
      if (!locName) continue;

      // Initialize group
      if (!groupMap.has(locName)) {
        groupMap.set(locName, {
          locationName: locName,
          countryCode: shop.location?.country?.code,
          tiles: [],
          brandLogos: [],
          brandSeen: new Set(),
          shopCoords: [],
          shopCount: 0,
        });
      }
      const group = groupMap.get(locName)!;
      group.shopCount++;

      // Collect coordinates for map tiles
      const coords = getShopCoordinates(shop);
      if (coords) group.shopCoords.push(coords);

      // Collect unique brand logos
      if (shop.brand?.documentId && shop.brand.logo && !group.brandSeen.has(shop.brand.documentId)) {
        const logoUrl = getMediaUrl(shop.brand.logo);
        if (logoUrl) {
          group.brandSeen.add(shop.brand.documentId);
          group.brandLogos.push(logoUrl);
        }
      }

      // Only recommended shops with featured images become photo tiles
      if (!hasCityAreaRecommendation(shop) || !shop.featured_image) continue;

      const asset = shop.featured_image as any;
      const imageUrl = asset?.formats?.small?.url || asset?.formats?.thumbnail?.url || getMediaUrl(shop.featured_image);
      if (!imageUrl) continue;

      const brandLogoUrl = getMediaUrl(shop.brand?.logo) || undefined;
      group.tiles.push({
        imageUrl,
        shopName: shop.name || '',
        brandLogoUrl,
      });
    }

    // Require at least 3 photo tiles per group, sort by count desc, cap total ~50 tiles
    const sorted = Array.from(groupMap.values())
      .filter(g => g.tiles.length >= 3)
      .sort((a, b) => b.tiles.length - a.tiles.length);

    let total = 0;
    const capped: LocationImageGroup[] = [];
    for (const group of sorted) {
      const remaining = 50 - total;
      if (remaining <= 0) break;
      const tiles = group.tiles.slice(0, remaining);
      const { brandSeen, ...rest } = group;
      capped.push({ ...rest, tiles });
      total += tiles.length;
    }
    return capped;
  }, [shops]);

  // Shop count per location
  const shopCountByLocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const shop of shops) {
      const locId = shop.location?.documentId;
      if (locId) map.set(locId, (map.get(locId) || 0) + 1);
    }
    return map;
  }, [shops]);

  // Featured cities: has background_image AND rating_stars >= 3.5, sorted by rating desc, take 8
  const featuredCities = useMemo(() => {
    return locations
      .filter((loc) => loc.rating_stars && loc.rating_stars > 0)
      .sort((a, b) => (b.rating_stars || 0) - (a.rating_stars || 0))
      .slice(0, 10);
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

  // In Focus: curated shops from different cities
  const inFocusShops = useMemo(() => {
    const targets = [
      { city: 'Bangkok', search: 'paga' },
      { city: 'London', search: 'watchhouse' },
      { city: 'Chiang Mai', search: 'ristr8to' },
    ];
    const results: Shop[] = [];
    for (const t of targets) {
      const match = shops.find((s) => s.name?.toLowerCase().includes(t.search));
      if (match) results.push(match);
    }
    return results;
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
              onPress={() => setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark')}
              size="sm"
              aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
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
        {heroVariant === 'grid' && imageGroups.length > 0 ? (
          <HeroSectionGrid
            headline={headline}
            subtitle={subtitle}
            imageGroups={imageGroups}
            isLoading={isLoading}
            onExploreMap={() => setExploreOpen(true)}
            onFindNearMe={onFindNearMe}
          />
        ) : (
          <HeroSection
            headline={headline}
            subtitle={subtitle}
            locationGroups={locationGroups}
            isLoading={isLoading}
            onExploreMap={() => setExploreOpen(true)}
            onFindNearMe={onFindNearMe}
          />
        )}
      </div>

      <FeaturedCities cities={featuredCities} onCitySelect={onLocationSelect} onExploreMap={() => setExploreOpen(true)} shopCountByLocation={shopCountByLocation} />

      <FeaturedShops shops={featuredShops} countryRegionMap={countryRegionMap} onShopSelect={onShopSelect} totalShopCount={shops.length} />

      <FeaturedRoasters shops={shops} />

      <CriticsPicks people={people} shops={shops} onShopSelect={onShopSelect} />

      {inFocusShops.length > 0 && (
        <InFocusSection shops={inFocusShops} onShopSelect={onShopSelect} />
      )}

      <section
        className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default"
        style={{ background: 'var(--surface-landing)' }}
      >
        <h2 className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16">
          Industry
        </h2>
        <div className="space-y-12 md:space-y-16">
          <FeaturedEvents events={upcomingEvents} />
          <LatestNews articles={newsArticles} countries={countries} onShopSelect={onShopSelect} />
        </div>
      </section>

      <CoffeeAroundWorld locations={locations} />

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
