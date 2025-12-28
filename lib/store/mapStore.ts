'use client';

import { create } from 'zustand';
import { Location, Shop, CityArea } from '../types';

interface MapState {
  // Location state
  selectedLocation: Location | null;
  selectedArea: CityArea | null;
  selectedShop: Shop | null;

  // User location
  userCoordinates: { lat: number; lng: number } | null;
  isNearbyMode: boolean;

  // UI state
  isDrawerOpen: boolean;
  isSidebarOpen: boolean;
  mapCenter: [number, number];
  mapZoom: number;

  // Actions
  setSelectedLocation: (location: Location | null) => void;
  setSelectedArea: (area: CityArea | null) => void;
  setSelectedShop: (shop: Shop | null) => void;
  setUserCoordinates: (coords: { lat: number; lng: number } | null) => void;
  setNearbyMode: (enabled: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedLocation: null,
  selectedArea: null,
  selectedShop: null,
  userCoordinates: null,
  isNearbyMode: false,
  isDrawerOpen: false,
  isSidebarOpen: true,
  mapCenter: [28.9784, 41.0082], // Istanbul
  mapZoom: 12,

  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setSelectedArea: (area) => set({ selectedArea: area }),
  setSelectedShop: (shop) => set({ selectedShop: shop, isDrawerOpen: !!shop }),
  setUserCoordinates: (coords) => set({ userCoordinates: coords }),
  setNearbyMode: (enabled) => set({ isNearbyMode: enabled }),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
}));
