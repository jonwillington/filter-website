'use client';

import { useState, useCallback, useEffect } from 'react';

interface GeolocationState {
  coordinates: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
  isPermissionBlocked: boolean;
  isFakeLocation: boolean;
}

const FAKE_GPS_KEY = 'dev_fake_gps';

// Get fake GPS coordinates from localStorage (dev only)
function getFakeGPS(): { lat: number; lng: number } | null {
  if (process.env.NODE_ENV !== 'development') return null;
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(FAKE_GPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading fake GPS:', error);
  }
  return null;
}

// Set fake GPS coordinates in localStorage (dev only)
export function setFakeGPS(lat: number, lng: number): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined') return;

  localStorage.setItem(FAKE_GPS_KEY, JSON.stringify({ lat, lng }));
  // Dispatch custom event to notify useGeolocation hooks
  window.dispatchEvent(new CustomEvent('fake-gps-changed'));
}

// Clear fake GPS coordinates (dev only)
export function clearFakeGPS(): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined') return;

  localStorage.removeItem(FAKE_GPS_KEY);
  // Dispatch custom event to notify useGeolocation hooks
  window.dispatchEvent(new CustomEvent('fake-gps-changed'));
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    isLoading: false,
    isPermissionBlocked: false,
    isFakeLocation: false,
  });

  // Check for fake GPS on mount and when it changes
  useEffect(() => {
    const checkFakeGPS = () => {
      const fakeGPS = getFakeGPS();
      if (fakeGPS) {
        setState({
          coordinates: fakeGPS,
          error: null,
          isLoading: false,
          isPermissionBlocked: false,
          isFakeLocation: true,
        });
      }
    };

    // Check immediately
    checkFakeGPS();

    // Listen for changes
    window.addEventListener('fake-gps-changed', checkFakeGPS);
    return () => window.removeEventListener('fake-gps-changed', checkFakeGPS);
  }, []);

  const requestLocation = useCallback(() => {
    // Check for fake GPS first (dev only)
    const fakeGPS = getFakeGPS();
    if (fakeGPS) {
      setState({
        coordinates: fakeGPS,
        error: null,
        isLoading: false,
        isPermissionBlocked: false,
        isFakeLocation: true,
      });
      return;
    }

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
          isFakeLocation: false,
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
          isFakeLocation: false,
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
