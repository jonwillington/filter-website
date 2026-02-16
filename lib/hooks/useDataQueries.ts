'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shop, Country, Location, CityArea, Event, Person, NewsArticle } from '@/lib/types';

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

// Fetch from static CDN files (generated at build time)
// Falls back to API routes if static files don't exist
async function fetchWithFallback<T>(staticPath: string, apiPath: string): Promise<T> {
  try {
    // Try static file first (served from CDN, very fast)
    const response = await fetch(staticPath);
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Static file not available, fall back to API
  }
  // Fall back to API route
  return fetchJSON<T>(apiPath);
}

export function useShopsQuery() {
  return useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: async () => {
      // D1 API returns transformed Shop objects — no client-side mapping needed
      const response = await fetch('/api/v2/shops');
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Failed to fetch shops: ${response.statusText}`);
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch full shop detail on demand (when user clicks a shop).
 * Returns complete shop with full brand, beans, suppliers, etc.
 */
export function useShopDetailQuery(documentId: string | null) {
  return useQuery<Shop | null>({
    queryKey: ['shopDetail', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const response = await fetch(`/api/v2/shops/${documentId}`);
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Failed to fetch shop detail: ${response.statusText}`);
    },
    enabled: !!documentId,
    staleTime: STALE_TIME,
  });
}

export function useCountriesQuery() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v2/countries');
        if (res.ok) return res.json();
      } catch {}
      return fetchWithFallback<Country[]>('/data/countries.json', '/api/data/countries');
    },
    staleTime: STALE_TIME,
  });
}

export function useLocationsQuery() {
  return useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v2/locations');
        if (res.ok) return res.json();
      } catch {}
      return fetchWithFallback<Location[]>('/data/locations.json', '/api/data/locations');
    },
    staleTime: STALE_TIME,
  });
}

export function useCityAreasQuery() {
  return useQuery<CityArea[]>({
    queryKey: ['cityAreas'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v2/city-areas');
        if (res.ok) return res.json();
      } catch {}
      return fetchWithFallback<CityArea[]>('/data/city-areas.json', '/api/data/city-areas');
    },
    staleTime: STALE_TIME,
  });
}

export function useEventsQuery() {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => fetchWithFallback<Event[]>('/data/events.json', '/api/data/events'),
    staleTime: STALE_TIME,
  });
}

export function usePeopleQuery() {
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
