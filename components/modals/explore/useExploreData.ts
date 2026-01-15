import { useMemo } from 'react';
import { Location, Country, Shop, Event } from '@/lib/types';
import { RegionGroup, SortDirection, REGION_ORDER } from './types';

interface UseExploreDataProps {
  locations: Location[];
  countries: Country[];
  allShops: Shop[];
  events: Event[];
  sortDirection: SortDirection;
}

export function useExploreData({
  locations,
  countries,
  allShops,
  events,
  sortDirection,
}: UseExploreDataProps) {
  // Create a map of location documentId -> shop count
  const shopCountByLocation = useMemo(() => {
    const countMap = new Map<string, number>();
    allShops.forEach((shop) => {
      const locationId = shop.location?.documentId;
      if (locationId) {
        countMap.set(locationId, (countMap.get(locationId) || 0) + 1);
      }
    });
    return countMap;
  }, [allShops]);

  // Create maps of country code and name -> country (with region) from the countries prop
  const { countryByCode, countryByName } = useMemo(() => {
    const byCode = new Map<string, Country>();
    const byName = new Map<string, Country>();
    countries.forEach((c) => {
      if (c.code) {
        byCode.set(c.code.toUpperCase(), c);
      }
      if (c.name) {
        byName.set(c.name.toLowerCase(), c);
      }
    });
    return { countryByCode: byCode, countryByName: byName };
  }, [countries]);

  // Group locations by region -> country
  const groupedData = useMemo((): RegionGroup[] => {
    const regionMap: Record<string, Record<string, { country: Country; locations: Location[] }>> = {};

    locations.forEach((location) => {
      const locationCountry = location.country;
      if (!locationCountry) return;

      // Get the full country data from countries prop (which has region object)
      // Try by code first, then by name
      const fullCountry =
        countryByCode.get(locationCountry.code?.toUpperCase() || '') ||
        countryByName.get(locationCountry.name?.toLowerCase() || '') ||
        locationCountry;

      // Access region.Name from the country object
      const region = fullCountry.region?.Name || 'Other';
      const countryName = fullCountry.name || locationCountry.name;

      if (!regionMap[region]) {
        regionMap[region] = {};
      }
      if (!regionMap[region][countryName]) {
        regionMap[region][countryName] = { country: fullCountry, locations: [] };
      }
      regionMap[region][countryName].locations.push(location);
    });

    // Build ordered result
    const orderedRegions = REGION_ORDER.filter((r) => regionMap[r]);
    const otherRegions = Object.keys(regionMap).filter((r) => !REGION_ORDER.includes(r));
    const allRegions = [...orderedRegions, ...otherRegions];

    return allRegions
      .map((region) => ({
        region,
        countries: Object.values(regionMap[region] || {})
          .sort((a, b) => a.country.name.localeCompare(b.country.name))
          .map((group) => ({
            ...group,
            locations: group.locations.sort((a, b) => {
              // Coming soon locations come last
              if (a.comingSoon && !b.comingSoon) return 1;
              if (!a.comingSoon && b.comingSoon) return -1;
              return a.name.localeCompare(b.name);
            }),
          })),
      }))
      .filter((r) => r.countries.length > 0);
  }, [locations, countryByCode, countryByName]);

  // Locations sorted by rating for the rating view (excludes coming soon)
  const locationsByRating = useMemo(() => {
    const filtered = [...locations].filter((loc) => loc.rating_stars != null && !loc.comingSoon);
    return filtered.sort((a, b) => {
      const diff = (b.rating_stars || 0) - (a.rating_stars || 0);
      return sortDirection === 'best' ? diff : -diff;
    });
  }, [locations, sortDirection]);

  // Events for current year, sorted chronologically
  const eventsThisYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return events
      .filter((event) => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear === currentYear;
      })
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
  }, [events]);

  return {
    shopCountByLocation,
    groupedData,
    locationsByRating,
    eventsThisYear,
  };
}
