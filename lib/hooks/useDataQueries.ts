'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shop, Country, Location, CityArea, Event, Person, NewsArticle, Brand } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBool(v: any): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  return v === 1 || v === true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

/**
 * Convert a D1 row (snake_case with b_ prefixed brand columns) to the
 * Shop shape expected by all components. Includes full brand data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function d1RowToShop(r: any): Shop {
  const brand: Brand | undefined = r.b_document_id ? {
    id: r.b_id ?? 0,
    documentId: r.b_document_id,
    name: r.b_name || '',
    type: r.b_type,
    role: r.b_role,
    description: r.b_description,
    story: r.b_story,
    statement: r.b_statement,
    founded: r.b_founded,
    founder: r.b_founder,
    logo: r.b_logo_url ? { url: r.b_logo_url, formats: parseJSON(r.b_logo_formats) } : null,
    'bg-image': r.b_bg_image_url ? { url: r.b_bg_image_url, formats: parseJSON(r.b_bg_image_formats) } : null,
    website: r.b_website,
    instagram: r.b_instagram,
    facebook: r.b_facebook,
    tiktok: r.b_tiktok,
    phone: r.b_phone,
    roastOwnBeans: toBool(r.b_roast_own_beans),
    ownRoastDesc: r.b_own_roast_desc,
    ownBeanLink: r.b_own_bean_link,
    specializes_light: toBool(r.b_specializes_light),
    specializes_medium: toBool(r.b_specializes_medium),
    specializes_dark: toBool(r.b_specializes_dark),
    has_wifi: toBool(r.b_has_wifi),
    has_food: toBool(r.b_has_food),
    has_outdoor_space: toBool(r.b_has_outdoor_space),
    is_pet_friendly: toBool(r.b_is_pet_friendly),
    has_espresso: toBool(r.b_has_espresso),
    has_filter_coffee: toBool(r.b_has_filter_coffee),
    has_v60: toBool(r.b_has_v60),
    has_chemex: toBool(r.b_has_chemex),
    has_aeropress: toBool(r.b_has_aeropress),
    has_french_press: toBool(r.b_has_french_press),
    has_cold_brew: toBool(r.b_has_cold_brew),
    has_batch_brew: toBool(r.b_has_batch_brew),
    equipment: parseJSON(r.b_equipment),
    awards: parseJSON(r.b_awards),
    citedSources: parseJSON(r.b_cited_sources),
  } : undefined;

  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name,
    slug: r.slug,
    prefName: r.pref_name,
    description: r.description,
    address: r.address,
    neighbourhood: r.neighbourhood,
    coordinates: r.lat != null ? { lat: r.lat, lng: r.lng } : null,
    localDensity: r.local_density ?? 0,
    brand,
    location: r.location_document_id ? {
      id: 0,
      documentId: r.location_document_id,
      name: r.location_name || '',
      slug: r.location_slug || undefined,
    } : undefined,
    city_area: r.city_area_document_id ? {
      id: 0,
      documentId: r.city_area_document_id,
      name: r.city_area_name || '',
      group: r.city_area_group,
      location: r.location_document_id ? {
        documentId: r.location_document_id,
        name: r.location_name || '',
      } : undefined,
    } : undefined,
    country: r.country_code ? { id: 0, documentId: '', name: '', code: r.country_code } : undefined,
    featured_image: r.featured_image_url ? {
      url: r.featured_image_url,
      formats: parseJSON(r.featured_image_formats),
    } : null,
    gallery: parseJSON(r.gallery),
    menus: parseJSON(r.menus),
    coffee_partner: r.coffee_partner_document_id ? {
      id: 0,
      documentId: r.coffee_partner_document_id,
      name: r.coffee_partner_name || '',
      logo: r.coffee_partner_logo_url ? { url: r.coffee_partner_logo_url } : null,
    } : null,
    google_rating: r.google_rating,
    google_review_count: r.google_review_count,
    google_place_id: r.google_place_id,
    google_formatted_address: r.google_formatted_address,
    website: r.website,
    phone: r.phone,
    phone_number: r.phone_number,
    instagram: r.instagram,
    facebook: r.facebook,
    tiktok: r.tiktok,
    independent: toBool(r.independent),
    is_chain: toBool(r.is_chain),
    cityarearec: toBool(r.city_area_rec),
    cityAreaRec: toBool(r.city_area_rec),
    workingRec: toBool(r.working_rec),
    interiorRec: toBool(r.interior_rec),
    brewingRec: toBool(r.brewing_rec),
    has_wifi: toBool(r.has_wifi),
    has_food: toBool(r.has_food),
    has_outdoor_space: toBool(r.has_outdoor_space),
    is_pet_friendly: toBool(r.is_pet_friendly),
    has_v60: toBool(r.has_v60),
    has_chemex: toBool(r.has_chemex),
    has_filter_coffee: toBool(r.has_filter_coffee),
    has_slow_bar: toBool(r.has_slow_bar),
    has_kitchen: toBool(r.has_kitchen),
    has_espresso: toBool(r.has_espresso),
    has_aeropress: toBool(r.has_aeropress),
    has_french_press: toBool(r.has_french_press),
    has_cold_brew: toBool(r.has_cold_brew),
    has_batch_brew: toBool(r.has_batch_brew),
    public_tags: parseJSON(r.public_tags),
    opening_hours: parseJSON(r.opening_hours),
    research: parseJSON(r.research),
    citedSources: parseJSON(r.cited_sources),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
  } as Shop;
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
      // D1 API returns raw rows — transform client-side
      const response = await fetch('/api/v2/shops');
      if (response.ok) {
        const rows = await response.json();
        return (rows as Record<string, unknown>[]).map(d1RowToShop);
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
