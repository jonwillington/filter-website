'use client';

import { useQuery } from '@tanstack/react-query';
import { detectUserArea } from '../api/geolocation';

export function useDetectUserArea(
  lat: number | null,
  lng: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['detect-user-area', lat, lng],
    queryFn: () => detectUserArea(lat!, lng!),
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes - user location doesn't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
