'use client';

import { useQuery } from '@tanstack/react-query';
import { getNearbyShops } from '../api/geolocation';

export function useNearbyShops(
  lat: number | null,
  lng: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['nearby-shops', lat, lng],
    queryFn: () => getNearbyShops(lat!, lng!),
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 30 * 1000, // 30 seconds
  });
}
