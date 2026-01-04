'use client';

import { useState, useCallback } from 'react';

interface GeolocationState {
  coordinates: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
  isPermissionBlocked: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    isLoading: false,
    isPermissionBlocked: false,
  });

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null, isPermissionBlocked: false }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          isLoading: false,
          isPermissionBlocked: false,
        });
      },
      (error) => {
        // Error code 1 = PERMISSION_DENIED
        const isBlocked = error.code === 1;
        setState({
          coordinates: null,
          error: error.message,
          isLoading: false,
          isPermissionBlocked: isBlocked,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const clearPermissionBlocked = useCallback(() => {
    setState((prev) => ({ ...prev, isPermissionBlocked: false }));
  }, []);

  return { ...state, requestLocation, clearPermissionBlocked };
}
