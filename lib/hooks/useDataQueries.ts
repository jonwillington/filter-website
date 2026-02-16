'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shop, Country, Location, CityArea, Event, Person, NewsArticle, Brand } from '@/lib/types';

/** Lightweight shop shape returned by /api/v2/shops (D1 summaries) */
export interface ShopSummary {
  documentId: string;
  name: string;
  slug: string | null;
  prefName: string | null;
  lat: number | null;
  lng: number | null;
  brandName: string | null;
  brandType: string | null;
  brandLogoUrl: string | null;
  brandStatement: string | null;
  brandDocumentId: string | null;
  countryCode: string | null;
  locationName: string | null;
  locationSlug: string | null;
  cityAreaName: string | null;
  cityAreaGroup: string | null;
  googleRating: number | null;
  localDensity: number;
  featuredImageUrl: string | null;
  qualityTier: string | null;
}

// Stable empty arrays to prevent re-render loops
const EMPTY_SHOPS: Shop[] = [];
const EMPTY_COUNTRIES: Country[] = [];
const EMPTY_LOCATIONS: Location[] = [];
const EMPTY_CITY_AREAS: CityArea[] = [];
const EMPTY_EVENTS: Event[] = [];
const EMPTY_PEOPLE: Person[] = [];
const EMPTY_NEWS_ARTICLES: NewsArticle[] = [];

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

// Fetch from static CDN files (generated at build time) - FAST
// Falls back to API routes if static files don't exist
async function fetchWithFallback<T>(staticPath: string, apiPath: string): Promise<T> {
  try {
    // Try static file first (served from CDN, very fast)
    const response = await fetch(staticPath);
    if (response.ok) {
      return response.json();
    }
  } catch (e) {
    // Static file not available, fall back to API
  }
  // Fall back to API route
  return fetchJSON<T>(apiPath);
}

/**
 * Convert a D1 ShopSummary to the Shop shape expected by map/list components.
 * Only summary fields are populated — detail fields will be null/undefined.
 */
function summaryToShop(s: ShopSummary): Shop {
  return {
    id: 0,
    documentId: s.documentId,
    name: s.name,
    slug: s.slug,
    prefName: s.prefName,
    coordinates: s.lat != null ? { lat: s.lat, lng: s.lng! } : null,
    brand: s.brandDocumentId ? {
      id: 0,
      documentId: s.brandDocumentId,
      name: s.brandName || '',
      type: s.brandType,
      logo: s.brandLogoUrl ? { url: s.brandLogoUrl } : null,
      statement: s.brandStatement,
    } : undefined,
    country: s.countryCode ? { id: 0, documentId: '', name: '', code: s.countryCode } : undefined,
    location: s.locationName ? { id: 0, documentId: '', name: s.locationName, slug: s.locationSlug || undefined } : undefined,
    city_area: s.cityAreaName ? { id: 0, documentId: '', name: s.cityAreaName, group: s.cityAreaGroup } : undefined,
    google_rating: s.googleRating,
    localDensity: s.localDensity,
    featured_image: s.featuredImageUrl ? { url: s.featuredImageUrl } : null,
  };
}

export function useShopsQuery() {
  return useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: async () => {
      // Try D1 edge API first (lightweight summaries)
      try {
        const response = await fetch('/api/v2/shops');
        if (response.ok) {
          const summaries: ShopSummary[] = await response.json();
          return summaries.map(summaryToShop);
        }
      } catch {
        // D1 not available, fall back to static JSON
      }

      // Fallback: static JSON files (original approach)
      const [shops, brands] = await Promise.all([
        fetchWithFallback<Shop[]>('/data/shops.json', '/api/data/shops'),
        fetchWithFallback<Brand[]>('/data/brands.json', '/api/data/brands'),
      ]);

      const brandMap = new Map(brands.map(b => [b.documentId, b]));
      return shops.map(shop => {
        if (shop.brand?.documentId) {
          const fullBrand = brandMap.get(shop.brand.documentId);
          if (fullBrand) {
            return {
              ...shop,
              brand: { ...fullBrand, logo: shop.brand.logo || fullBrand.logo },
            };
          }
        }
        return shop;
      });
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch full shop detail on demand (when user clicks a shop).
 * Returns complete shop with full brand, beans, suppliers, etc.
 * Falls back to finding the shop in the already-loaded shops array.
 */
export function useShopDetailQuery(documentId: string | null) {
  return useQuery<Shop | null>({
    queryKey: ['shopDetail', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      // Try D1 detail endpoint
      try {
        const response = await fetch(`/api/v2/shops/${documentId}`);
        if (response.ok) {
          return response.json();
        }
      } catch {
        // D1 not available
      }

      // Fallback: fetch from static JSON and find the shop
      const [shops, brands] = await Promise.all([
        fetchWithFallback<Shop[]>('/data/shops.json', '/api/data/shops'),
        fetchWithFallback<Brand[]>('/data/brands.json', '/api/data/brands'),
      ]);

      const shop = shops.find(s => s.documentId === documentId);
      if (!shop) return null;

      if (shop.brand?.documentId) {
        const fullBrand = brands.find(b => b.documentId === shop.brand!.documentId);
        if (fullBrand) {
          return { ...shop, brand: { ...fullBrand, logo: shop.brand.logo || fullBrand.logo } };
        }
      }
      return shop;
    },
    enabled: !!documentId,
    staleTime: STALE_TIME,
  });
}

export function useCountriesQuery() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: () => fetchWithFallback<Country[]>('/data/countries.json', '/api/data/countries'),
    staleTime: STALE_TIME,
  });
}

export function useLocationsQuery() {
  return useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => fetchWithFallback<Location[]>('/data/locations.json', '/api/data/locations'),
    staleTime: STALE_TIME,
  });
}

export function useCityAreasQuery() {
  return useQuery<CityArea[]>({
    queryKey: ['cityAreas'],
    queryFn: () => fetchWithFallback<CityArea[]>('/data/city-areas.json', '/api/data/city-areas'),
    staleTime: STALE_TIME,
  });
}

export function useEventsQuery() {
  // Try static file first, fall back to API
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => fetchWithFallback<Event[]>('/data/events.json', '/api/data/events'),
    staleTime: STALE_TIME,
  });
}

export function usePeopleQuery() {
  // Try static file first, fall back to API
  return useQuery<Person[]>({
    queryKey: ['people'],
    queryFn: () => fetchWithFallback<Person[]>('/data/people.json', '/api/data/people'),
    staleTime: STALE_TIME,
  });
}

export function useNewsArticlesQuery() {
  return useQuery<NewsArticle[]>({
    queryKey: ['newsArticles'],
    queryFn: () => fetchWithFallback<NewsArticle[]>('/data/news-articles.json', '/api/data/news-articles'),
    staleTime: STALE_TIME,
  });
}

/**
 * Combined hook that fetches all data needed for the homepage.
 * Returns individual query results for fine-grained loading states.
 */
export function useHomeData() {
  const shopsQuery = useShopsQuery();
  const countriesQuery = useCountriesQuery();
  const locationsQuery = useLocationsQuery();
  const cityAreasQuery = useCityAreasQuery();
  const eventsQuery = useEventsQuery();
  const peopleQuery = usePeopleQuery();
  const newsArticlesQuery = useNewsArticlesQuery();

  // Use stable empty arrays to prevent re-render loops
  const shops = shopsQuery.data ?? EMPTY_SHOPS;
  const countries = countriesQuery.data ?? EMPTY_COUNTRIES;
  const locations = locationsQuery.data ?? EMPTY_LOCATIONS;
  const cityAreas = cityAreasQuery.data ?? EMPTY_CITY_AREAS;
  const events = eventsQuery.data ?? EMPTY_EVENTS;
  const people = peopleQuery.data ?? EMPTY_PEOPLE;
  const newsArticles = newsArticlesQuery.data ?? EMPTY_NEWS_ARTICLES;

  const isLoading =
    shopsQuery.isLoading ||
    countriesQuery.isLoading ||
    locationsQuery.isLoading ||
    cityAreasQuery.isLoading ||
    eventsQuery.isLoading ||
    peopleQuery.isLoading;

  const isError =
    shopsQuery.isError ||
    countriesQuery.isError ||
    locationsQuery.isError ||
    cityAreasQuery.isError ||
    eventsQuery.isError ||
    peopleQuery.isError;

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    shops,
    countries,
    locations,
    cityAreas,
    events,
    people,
    newsArticles,
    isLoading,
    isError,
    // Individual loading states for progressive rendering
    isShopsLoading: shopsQuery.isLoading,
    isCountriesLoading: countriesQuery.isLoading,
    isLocationsLoading: locationsQuery.isLoading,
    isCityAreasLoading: cityAreasQuery.isLoading,
    isEventsLoading: eventsQuery.isLoading,
    isPeopleLoading: peopleQuery.isLoading,
    isNewsArticlesLoading: newsArticlesQuery.isLoading,
    // Refetch functions if needed
    refetchShops: shopsQuery.refetch,
    refetchAll: () => {
      shopsQuery.refetch();
      countriesQuery.refetch();
      locationsQuery.refetch();
      cityAreasQuery.refetch();
      eventsQuery.refetch();
      peopleQuery.refetch();
      newsArticlesQuery.refetch();
    },
  }), [
    shops,
    countries,
    locations,
    cityAreas,
    events,
    people,
    newsArticles,
    isLoading,
    isError,
    shopsQuery.isLoading,
    countriesQuery.isLoading,
    locationsQuery.isLoading,
    cityAreasQuery.isLoading,
    eventsQuery.isLoading,
    peopleQuery.isLoading,
    newsArticlesQuery.isLoading,
    shopsQuery.refetch,
    countriesQuery.refetch,
    locationsQuery.refetch,
    cityAreasQuery.refetch,
    eventsQuery.refetch,
    peopleQuery.refetch,
    newsArticlesQuery.refetch,
  ]);
}
