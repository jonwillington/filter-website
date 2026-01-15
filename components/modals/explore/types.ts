import { Location, Country, Shop, Event } from '@/lib/types';

export type ViewMode = 'region' | 'rating' | 'events';
export type SortDirection = 'best' | 'worst';

export interface CountryGroup {
  country: Country;
  locations: Location[];
}

export interface RegionGroup {
  region: string;
  countries: CountryGroup[];
}

export interface ExploreViewProps {
  locations: Location[];
  countries: Country[];
  allShops: Shop[];
  events: Event[];
  onLocationSelect: (location: Location) => void;
}

// Region display order
export const REGION_ORDER = [
  'Europe',
  'Asia',
  'North America',
  'Central Asia',
  'Oceania',
  'South America',
  'Middle East',
  'Africa',
];

// Get flag URL from country code
export const getFlagUrl = (countryCode: string | undefined): string | null => {
  if (!countryCode) return null;
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};
