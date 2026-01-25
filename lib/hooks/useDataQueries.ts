'use client';

import { useQuery } from '@tanstack/react-query';
import { Shop, Country, Location, CityArea, Event } from '@/lib/types';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

export function useShopsQuery() {
  return useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: () => fetchJSON<Shop[]>('/api/data/shops'),
    staleTime: STALE_TIME,
  });
}

export function useCountriesQuery() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: () => fetchJSON<Country[]>('/api/data/countries'),
    staleTime: STALE_TIME,
  });
}

export function useLocationsQuery() {
  return useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => fetchJSON<Location[]>('/api/data/locations'),
    staleTime: STALE_TIME,
  });
}

export function useCityAreasQuery() {
  return useQuery<CityArea[]>({
    queryKey: ['cityAreas'],
    queryFn: () => fetchJSON<CityArea[]>('/api/data/city-areas'),
    staleTime: STALE_TIME,
  });
}

export function useEventsQuery() {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => fetchJSON<Event[]>('/api/data/events'),
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

  const isLoading =
    shopsQuery.isLoading ||
    countriesQuery.isLoading ||
    locationsQuery.isLoading ||
    cityAreasQuery.isLoading ||
    eventsQuery.isLoading;

  const isError =
    shopsQuery.isError ||
    countriesQuery.isError ||
    locationsQuery.isError ||
    cityAreasQuery.isError ||
    eventsQuery.isError;

  return {
    shops: shopsQuery.data ?? [],
    countries: countriesQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    cityAreas: cityAreasQuery.data ?? [],
    events: eventsQuery.data ?? [],
    isLoading,
    isError,
    // Individual loading states for progressive rendering
    isShopsLoading: shopsQuery.isLoading,
    isCountriesLoading: countriesQuery.isLoading,
    isLocationsLoading: locationsQuery.isLoading,
    isCityAreasLoading: cityAreasQuery.isLoading,
    isEventsLoading: eventsQuery.isLoading,
    // Refetch functions if needed
    refetchShops: shopsQuery.refetch,
    refetchAll: () => {
      shopsQuery.refetch();
      countriesQuery.refetch();
      locationsQuery.refetch();
      cityAreasQuery.refetch();
      eventsQuery.refetch();
    },
  };
}
