# Filter Coffee Website - Implementation Guide

A step-by-step guide to building the SEO-optimized coffee shop discovery website.

---

## Batch 1: Project Setup

### 1.1 Initialize Next.js Project

```bash
# In filter-website directory, remove CRA files
rm -rf src build node_modules package-lock.json
rm -f tsconfig.json

# Create new Next.js project (in parent directory, then move)
cd ..
npx create-next-app@latest filter-website-new --typescript --tailwind --app --use-npm
# Select: Yes to ESLint, No to Turbopack, Yes to customize import alias (@/*)

# Move files back
cp -r filter-website-new/* filter-website/
rm -rf filter-website-new
cd filter-website
```

### 1.2 Install Dependencies

```bash
npm install @heroui/react @heroui/theme framer-motion
npm install mapbox-gl @types/mapbox-gl
npm install zustand @tanstack/react-query
npm install clsx tailwind-merge
```

### 1.3 Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_STRAPI_TOKEN=87b29e7b2b252f230b798c10d3926eb306859d507fd9e676a441883c9d735ca502c1aa49a8838d5c7217b0b4795430a5ebac1ca5f9ac78f8ba9693b3e456ab19e52d70ed04e0568bb6a918c564ddefebe15759b88528f4c0ce25e9ba7b09303472ff0c209374f33bf63c3064a62ffdde1fcd979b7c5cc0baa4a8d8fd1a0868c4
NEXT_PUBLIC_STRAPI_URL=https://helpful-oasis-8bb949e05d.strapiapp.com/api
NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>
```

### 1.4 Tailwind Config

Update `tailwind.config.ts` with Filter brand colors:
```typescript
import { heroui } from "@heroui/react";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#FAFAFA',
        contrastBlock: '#2E1F17',
        contrastText: '#FFFDFB',
        accent: '#8B6F47',
        secondary: '#4A3B2E',
        text: '#1A1A1A',
        textSecondary: '#9A9A9A',
        border: '#E5DDD5',
        buttonPrimary: '#3D2A1F',
        buttonText: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

export default config;
```

---

## Batch 2: API Foundation

### 2.1 Types (copy from filter-expo)

Create `lib/types/index.ts`:
```typescript
// Core types from filter-expo/src/types/index.ts

export interface MediaAsset {
  id?: number;
  documentId?: string;
  url?: string;
  formats?: Record<string, MediaFormat>;
}

export interface MediaFormat {
  url?: string;
  width?: number;
  height?: number;
}

export interface Country {
  id: number;
  documentId: string;
  name: string;
  code: string;
  primaryColor?: string;
  secondaryColor?: string;
  story?: string;
  supported?: boolean;
  comingSoon?: boolean;
  locations?: Location[];
}

export interface Location {
  id: number;
  documentId: string;
  name: string;
  slug?: string;
  rating?: string | null;
  rating_stars?: number | null;
  inFocus?: boolean;
  story?: string | null;
  headline?: string | null;
  background_image?: MediaAsset | null;
  shops?: Shop[];
  city_areas?: CityArea[];
  country?: Country;
  coordinates?: { lat: number; lng: number };
}

export interface CityArea {
  id: number;
  documentId: string;
  name: string;
  slug?: string;
  description?: string | null;
  summary?: string | null;
  featuredImage?: MediaAsset | null;
  location?: Location;
  shops?: Shop[];
}

export interface Brand {
  id: number;
  documentId: string;
  name: string;
  description?: string | null;
  logo?: MediaAsset | null;
  website?: string | null;
  instagram?: string | null;
}

export interface OpeningHours {
  periods?: OpeningHoursPeriod[];
  display?: string | null;
  today?: string | null;
  open_now?: boolean;
}

export interface OpeningHoursPeriod {
  day: number;
  open: string;
  close: string;
}

export interface Shop {
  id: number;
  documentId: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: Location;
  cityArea?: CityArea;
  city_area?: CityArea;
  country?: Country;
  brand?: Brand;
  featured_image?: MediaAsset | null;
  gallery?: MediaAsset[] | null;

  // Amenities
  has_wifi?: boolean;
  has_v60?: boolean;
  has_chemex?: boolean;
  has_filter_coffee?: boolean;
  has_slow_bar?: boolean;
  has_kitchen?: boolean;
  has_outdoor_space?: boolean;
  independent?: boolean;

  // Ratings & Hours
  opening_hours?: OpeningHours | null;
  is_open?: boolean | null;
  google_rating?: number | null;
  google_review_count?: number | null;

  // Contact
  website?: string | null;
  phone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
}

export interface NearbyShopsResponse {
  shops: Array<{
    id: string;
    documentId?: string;
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    distance_metres?: number;
    distance_meters?: number;
    city_area?: { name: string };
  }>;
  total_shops_found?: number;
  shop_search_radius?: number;
}

export interface GeoLocationResponse {
  area?: CityArea;
  match_type?: 'boundary' | 'radius';
  user_coordinates: { lat: number; lng: number };
}

export type ShopWithDistance = Shop & {
  distance?: number;
  distanceFormatted?: string;
};
```

### 2.2 API Client

Create `lib/api/client.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      ...options?.headers,
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data ?? data;
}
```

### 2.3 API Services

Create `lib/api/locations.ts`:
```typescript
import { apiClient } from './client';
import { Location } from '../types';

const LOCATION_POPULATE = 'populate[background_image]=*&populate[country]=*&populate[city_areas]=*';

export async function getAllLocations(): Promise<Location[]> {
  const data = await apiClient<Location[]>(
    `/locations?${LOCATION_POPULATE}&pagination[pageSize]=100`
  );
  return data;
}

export async function getLocationBySlug(slug: string): Promise<Location | null> {
  const data = await apiClient<Location[]>(
    `/locations?filters[name][$eqi]=${slug}&${LOCATION_POPULATE}`
  );
  return data[0] ?? null;
}
```

Create `lib/api/shops.ts`:
```typescript
import { apiClient } from './client';
import { Shop } from '../types';

const SHOP_POPULATE = [
  'populate[brand][populate]=logo',
  'populate[location]=*',
  'populate[city_area]=*',
  'populate[featured_image]=*',
  'populate[gallery]=*',
].join('&');

export async function getShopsByLocation(locationDocumentId: string): Promise<Shop[]> {
  const data = await apiClient<Shop[]>(
    `/shops?filters[location][documentId][$eq]=${locationDocumentId}&${SHOP_POPULATE}&pagination[pageSize]=200`
  );
  return data;
}

export async function getShopBySlug(shopSlug: string): Promise<Shop | null> {
  const data = await apiClient<Shop[]>(
    `/shops?filters[slug][$eq]=${shopSlug}&${SHOP_POPULATE}`
  );
  return data[0] ?? null;
}

export async function getAllShops(): Promise<Shop[]> {
  const data = await apiClient<Shop[]>(
    `/shops?${SHOP_POPULATE}&pagination[pageSize]=500`
  );
  return data;
}
```

Create `lib/api/geolocation.ts`:
```typescript
import { apiClient } from './client';
import { NearbyShopsResponse, GeoLocationResponse } from '../types';

export async function getNearbyShops(
  lat: number,
  lng: number,
  radius: number = 2000,
  limit: number = 50
): Promise<NearbyShopsResponse> {
  return apiClient<NearbyShopsResponse>(
    `/geo-location/nearby-shops?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`
  );
}

export async function detectUserArea(
  lat: number,
  lng: number
): Promise<GeoLocationResponse> {
  return apiClient<GeoLocationResponse>(
    `/geo-location/area?lat=${lat}&lng=${lng}`
  );
}
```

---

## Batch 3: Providers & Base Layout

### 3.1 HeroUI Provider

Create `app/providers.tsx`:
```typescript
'use client';

import { HeroUIProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        {children}
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
```

### 3.2 Root Layout

Update `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Filter - Discover Specialty Coffee',
  description: 'Find the best specialty coffee shops around the world',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 3.3 Global Styles

Update `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Three-panel layout */
.main-layout {
  display: grid;
  grid-template-columns: 340px 1fr 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-layout.drawer-open {
  grid-template-columns: 340px 1fr 400px;
}

/* Sidebar */
.sidebar {
  position: relative;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

/* Map area */
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Shop drawer */
.shop-drawer {
  position: relative;
  height: 100%;
  background: white;
  border-left: 1px solid var(--border);
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Footer */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 200;
}

/* Mobile responsive */
@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 48px;
    width: 100%;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .shop-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 48px;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .footer {
    height: 56px;
    padding: 0 16px;
  }
}
```

---

## Batch 4: Core Components - Sidebar

### 4.1 Sidebar Component

Create `components/sidebar/Sidebar.tsx`:
```typescript
'use client';

import { LocationSelector } from './LocationSelector';
import { ShopList } from './ShopList';
import { Location, Shop } from '@/lib/types';

interface SidebarProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
  isLoading?: boolean;
}

export function Sidebar({
  locations,
  selectedLocation,
  onLocationChange,
  shops,
  selectedShop,
  onShopSelect,
  isNearbyMode,
  onNearbyToggle,
  isLoading,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-contrastBlock mb-4">Filter</h1>
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={onNearbyToggle}
        />
      </div>

      <ShopList
        shops={shops}
        selectedShop={selectedShop}
        onShopSelect={onShopSelect}
        isLoading={isLoading}
      />
    </aside>
  );
}
```

### 4.2 Location Selector

Create `components/sidebar/LocationSelector.tsx`:
```typescript
'use client';

import { Select, SelectItem } from '@heroui/react';
import { Location } from '@/lib/types';

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
}

export function LocationSelector({
  locations,
  selectedLocation,
  onLocationChange,
  isNearbyMode,
  onNearbyToggle,
}: LocationSelectorProps) {
  const handleChange = (value: string) => {
    if (value === 'nearby') {
      onNearbyToggle();
    } else {
      const location = locations.find(l => l.documentId === value);
      onLocationChange(location ?? null);
    }
  };

  return (
    <Select
      label="Location"
      placeholder="Select a city"
      selectedKeys={isNearbyMode ? ['nearby'] : selectedLocation ? [selectedLocation.documentId] : []}
      onSelectionChange={(keys) => {
        const value = Array.from(keys)[0] as string;
        handleChange(value);
      }}
      classNames={{
        trigger: 'bg-surface border-border',
        value: 'text-text',
      }}
    >
      <SelectItem key="nearby" value="nearby">
        Nearby
      </SelectItem>
      {locations.map((location) => (
        <SelectItem key={location.documentId} value={location.documentId}>
          {location.name}
        </SelectItem>
      ))}
    </Select>
  );
}
```

### 4.3 Shop List

Create `components/sidebar/ShopList.tsx`:
```typescript
'use client';

import { Shop } from '@/lib/types';
import { ShopCard } from './ShopCard';
import { Skeleton } from '@heroui/react';

interface ShopListProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
}

export function ShopList({
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
}: ShopListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-textSecondary">
          No coffee shops found in this area.
        </p>
      </div>
    );
  }

  // Group shops by area
  const shopsByArea = shops.reduce((acc, shop) => {
    const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? 'Other';
    if (!acc[areaName]) acc[areaName] = [];
    acc[areaName].push(shop);
    return acc;
  }, {} as Record<string, Shop[]>);

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(shopsByArea).map(([areaName, areaShops]) => (
        <div key={areaName}>
          <div className="sticky top-0 bg-surface/90 backdrop-blur-sm px-4 py-2 border-b border-border">
            <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wide">
              {areaName}
            </h3>
          </div>
          <div className="p-2 space-y-1">
            {areaShops.map((shop) => (
              <ShopCard
                key={shop.documentId}
                shop={shop}
                isSelected={selectedShop?.documentId === shop.documentId}
                onClick={() => onShopSelect(shop)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4.4 Shop Card

Create `components/sidebar/ShopCard.tsx`:
```typescript
'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { clsx } from 'clsx';

interface ShopCardProps {
  shop: Shop;
  isSelected: boolean;
  onClick: () => void;
}

export function ShopCard({ shop, isSelected, onClick }: ShopCardProps) {
  const logoUrl = shop.brand?.logo?.url;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-accent/10 border border-accent'
          : 'hover:bg-surface border border-transparent'
      )}
    >
      <Avatar
        src={logoUrl}
        name={shop.brand?.name ?? shop.name}
        size="md"
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-text truncate">
          {shop.name}
        </h4>
        <p className="text-sm text-textSecondary truncate">
          {shop.city_area?.name ?? shop.cityArea?.name}
        </p>
      </div>
    </button>
  );
}
```

---

## Batch 5: Core Components - Map

### 5.1 Map Container

Create `components/map/MapContainer.tsx`:
```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Shop } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapContainerProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  center?: [number, number];
  zoom?: number;
}

export function MapContainer({
  shops,
  selectedShop,
  onShopSelect,
  center = [28.9784, 41.0082], // Default: Istanbul
  zoom = 12,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when shops change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    // Add new markers
    shops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;

      const el = document.createElement('div');
      el.className = 'shop-marker';

      // Use brand logo or default icon
      const logoUrl = shop.brand?.logo?.url;
      if (logoUrl) {
        el.style.backgroundImage = `url(${logoUrl})`;
        el.style.backgroundSize = 'cover';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      } else {
        el.innerHTML = '☕';
        el.style.fontSize = '24px';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.background = 'white';
        el.style.borderRadius = '50%';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      }

      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([shop.longitude, shop.latitude])
        .addTo(map.current!);

      el.addEventListener('click', () => onShopSelect(shop));

      markers.current.push(marker);
    });
  }, [shops, onShopSelect]);

  // Fly to selected shop
  useEffect(() => {
    if (!map.current || !selectedShop?.latitude || !selectedShop?.longitude) return;

    map.current.flyTo({
      center: [selectedShop.longitude, selectedShop.latitude],
      zoom: 15,
      duration: 1000,
    });
  }, [selectedShop]);

  return (
    <div ref={mapContainer} className="map-container w-full h-full" />
  );
}
```

### 5.2 Add Mapbox CSS

Add to `app/globals.css`:
```css
/* Mapbox marker styles */
.shop-marker {
  transition: transform 0.2s ease;
}

.shop-marker:hover {
  transform: scale(1.1);
  z-index: 10;
}

.shop-marker.selected {
  transform: scale(1.2);
  z-index: 20;
}

/* Hide default mapbox attribution on mobile */
@media (max-width: 768px) {
  .mapboxgl-ctrl-bottom-left,
  .mapboxgl-ctrl-bottom-right {
    display: none;
  }
}
```

---

## Batch 6: Core Components - Shop Drawer

### 6.1 Shop Drawer

Create `components/detail/ShopDrawer.tsx`:
```typescript
'use client';

import { Shop } from '@/lib/types';
import { ShopHeader } from './ShopHeader';
import { ShopInfo } from './ShopInfo';
import { AmenityList } from './AmenityList';
import { PhotoGallery } from './PhotoGallery';
import { SocialLinks } from './SocialLinks';
import { Button } from '@heroui/react';
import { X } from 'lucide-react';

interface ShopDrawerProps {
  shop: Shop;
  onClose: () => void;
}

export function ShopDrawer({ shop, onClose }: ShopDrawerProps) {
  return (
    <div className="shop-drawer">
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold text-contrastBlock">Shop Details</h2>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        <ShopHeader shop={shop} />
        <ShopInfo shop={shop} />
        <AmenityList shop={shop} />
        <PhotoGallery shop={shop} />
        <SocialLinks shop={shop} />
      </div>
    </div>
  );
}
```

### 6.2 Shop Header

Create `components/detail/ShopHeader.tsx`:
```typescript
import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';

interface ShopHeaderProps {
  shop: Shop;
}

export function ShopHeader({ shop }: ShopHeaderProps) {
  const logoUrl = shop.brand?.logo?.url;

  return (
    <div className="flex items-center gap-4">
      <Avatar
        src={logoUrl}
        name={shop.brand?.name ?? shop.name}
        size="lg"
        className="flex-shrink-0"
      />
      <div>
        <h1 className="text-xl font-bold text-contrastBlock">
          {shop.name}
        </h1>
        <p className="text-textSecondary">
          {shop.city_area?.name ?? shop.cityArea?.name}
          {shop.location?.name && `, ${shop.location.name}`}
        </p>
      </div>
    </div>
  );
}
```

### 6.3 Shop Info

Create `components/detail/ShopInfo.tsx`:
```typescript
import { Shop } from '@/lib/types';
import { MapPin, Clock, Phone, Star } from 'lucide-react';
import { Chip } from '@heroui/react';

interface ShopInfoProps {
  shop: Shop;
}

export function ShopInfo({ shop }: ShopInfoProps) {
  const isOpen = shop.is_open ?? shop.opening_hours?.open_now;
  const todayHours = shop.opening_hours?.today ?? shop.opening_hours?.display;

  return (
    <div className="space-y-3">
      {/* Address */}
      {shop.address && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text hover:text-accent transition-colors"
          >
            {shop.address}
          </a>
        </div>
      )}

      {/* Opening Hours */}
      {(todayHours || isOpen !== undefined) && (
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-accent flex-shrink-0" />
          <div className="flex items-center gap-2">
            {isOpen !== undefined && (
              <Chip
                size="sm"
                color={isOpen ? 'success' : 'default'}
                variant="flat"
              >
                {isOpen ? 'Open' : 'Closed'}
              </Chip>
            )}
            {todayHours && (
              <span className="text-textSecondary text-sm">{todayHours}</span>
            )}
          </div>
        </div>
      )}

      {/* Phone */}
      {shop.phone && (
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-accent flex-shrink-0" />
          <a
            href={`tel:${shop.phone}`}
            className="text-text hover:text-accent transition-colors"
          >
            {shop.phone}
          </a>
        </div>
      )}

      {/* Google Rating */}
      {shop.google_rating && (
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-accent flex-shrink-0" />
          <span className="text-text">
            {shop.google_rating.toFixed(1)}
            {shop.google_review_count && (
              <span className="text-textSecondary ml-1">
                ({shop.google_review_count} reviews)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
```

### 6.4 Amenity List

Create `components/detail/AmenityList.tsx`:
```typescript
import { Shop } from '@/lib/types';
import { Wifi, Coffee, Sun, UtensilsCrossed } from 'lucide-react';
import { Chip } from '@heroui/react';

interface AmenityListProps {
  shop: Shop;
}

const amenities = [
  { key: 'has_wifi', label: 'WiFi', icon: Wifi },
  { key: 'has_v60', label: 'V60', icon: Coffee },
  { key: 'has_chemex', label: 'Chemex', icon: Coffee },
  { key: 'has_filter_coffee', label: 'Filter', icon: Coffee },
  { key: 'has_slow_bar', label: 'Slow Bar', icon: Coffee },
  { key: 'has_kitchen', label: 'Food', icon: UtensilsCrossed },
  { key: 'has_outdoor_space', label: 'Outdoor', icon: Sun },
] as const;

export function AmenityList({ shop }: AmenityListProps) {
  const activeAmenities = amenities.filter(
    (a) => shop[a.key as keyof Shop] === true
  );

  if (activeAmenities.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-3">
        Amenities
      </h3>
      <div className="flex flex-wrap gap-2">
        {activeAmenities.map(({ key, label, icon: Icon }) => (
          <Chip
            key={key}
            variant="flat"
            startContent={<Icon className="w-4 h-4" />}
          >
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
```

### 6.5 Photo Gallery

Create `components/detail/PhotoGallery.tsx`:
```typescript
import { Shop } from '@/lib/types';
import { Image } from '@heroui/react';

interface PhotoGalleryProps {
  shop: Shop;
}

export function PhotoGallery({ shop }: PhotoGalleryProps) {
  const featuredImage = shop.featured_image?.url;
  const gallery = shop.gallery?.filter((img) => img.url) ?? [];

  if (!featuredImage && gallery.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-3">
        Photos
      </h3>

      {featuredImage && (
        <Image
          src={featuredImage}
          alt={shop.name}
          className="w-full h-48 object-cover rounded-lg mb-2"
        />
      )}

      {gallery.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {gallery.slice(0, 6).map((img, i) => (
            <Image
              key={i}
              src={img.url}
              alt={`${shop.name} photo ${i + 1}`}
              className="w-full h-20 object-cover rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6.6 Social Links

Create `components/detail/SocialLinks.tsx`:
```typescript
import { Shop } from '@/lib/types';
import { Button } from '@heroui/react';
import { Globe, Instagram, MapPin } from 'lucide-react';

interface SocialLinksProps {
  shop: Shop;
}

export function SocialLinks({ shop }: SocialLinksProps) {
  const hasLinks = shop.website || shop.instagram;

  if (!hasLinks && !shop.latitude) return null;

  const mapsUrl = shop.latitude && shop.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
    : null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wide">
        Links
      </h3>
      <div className="flex flex-wrap gap-2">
        {mapsUrl && (
          <Button
            as="a"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="flat"
            startContent={<MapPin className="w-4 h-4" />}
          >
            Directions
          </Button>
        )}

        {shop.website && (
          <Button
            as="a"
            href={shop.website}
            target="_blank"
            rel="noopener noreferrer"
            variant="flat"
            startContent={<Globe className="w-4 h-4" />}
          >
            Website
          </Button>
        )}

        {shop.instagram && (
          <Button
            as="a"
            href={`https://instagram.com/${shop.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="flat"
            startContent={<Instagram className="w-4 h-4" />}
          >
            Instagram
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## Batch 7: Footer & Main Page

### 7.1 Footer Component

Create `components/layout/Footer.tsx`:
```typescript
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer">
      <div className="flex items-center gap-4 text-sm text-textSecondary">
        <Link href="/privacy" className="hover:text-accent transition-colors">
          Privacy Policy
        </Link>
        <span>•</span>
        <Link href="/terms" className="hover:text-accent transition-colors">
          Terms & Conditions
        </Link>
      </div>

      <div className="text-sm text-textSecondary">
        © {new Date().getFullYear()} Filter Coffee
      </div>
    </footer>
  );
}
```

### 7.2 Main Layout Component

Create `components/layout/MainLayout.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar/Sidebar';
import { MapContainer } from '../map/MapContainer';
import { ShopDrawer } from '../detail/ShopDrawer';
import { Footer } from './Footer';
import { Location, Shop } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { clsx } from 'clsx';

interface MainLayoutProps {
  locations: Location[];
  initialLocation?: Location | null;
  shops: Shop[];
  initialShop?: Shop | null;
}

export function MainLayout({
  locations,
  initialLocation,
  shops,
  initialShop,
}: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation ?? null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(initialShop ?? null);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLocationChange = (location: Location | null) => {
    setSelectedLocation(location);
    setSelectedShop(null);
    setIsNearbyMode(false);

    if (location) {
      router.push(`/${location.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else {
      router.push('/');
    }
  };

  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop);

    // Build URL
    const citySlug = shop.location?.name?.toLowerCase().replace(/\s+/g, '-') ?? '';
    const areaSlug = (shop.city_area?.name ?? shop.cityArea?.name)?.toLowerCase().replace(/\s+/g, '-') ?? '';
    const shopSlug = shop.slug ?? shop.name.toLowerCase().replace(/\s+/g, '-');

    if (citySlug && areaSlug && shopSlug) {
      router.push(`/${citySlug}/${areaSlug}/${shopSlug}`);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedShop(null);

    if (selectedLocation) {
      router.push(`/${selectedLocation.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else {
      router.push('/');
    }
  };

  const handleNearbyToggle = () => {
    setIsNearbyMode(true);
    setSelectedLocation(null);
    // TODO: Trigger geolocation and fetch nearby shops
  };

  // Calculate map center from shops or selected location
  const mapCenter: [number, number] = selectedLocation?.coordinates
    ? [selectedLocation.coordinates.lng, selectedLocation.coordinates.lat]
    : shops.length > 0 && shops[0].longitude && shops[0].latitude
    ? [shops[0].longitude, shops[0].latitude]
    : [28.9784, 41.0082]; // Default: Istanbul

  return (
    <>
      <div className={clsx('main-layout', selectedShop && 'drawer-open')}>
        <Sidebar
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          shops={shops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={handleNearbyToggle}
          isLoading={isLoading}
        />

        <MapContainer
          shops={shops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          center={mapCenter}
        />

        {selectedShop && (
          <ShopDrawer
            shop={selectedShop}
            onClose={handleCloseDrawer}
          />
        )}
      </div>

      <Footer />
    </>
  );
}
```

### 7.3 Home Page

Update `app/page.tsx`:
```typescript
import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations } from '@/lib/api/locations';
import { getShopsByLocation } from '@/lib/api/shops';

export default async function HomePage() {
  const locations = await getAllLocations();

  // Default to first location (or Istanbul)
  const defaultLocation = locations.find(l => l.name.toLowerCase() === 'istanbul') ?? locations[0];
  const shops = defaultLocation
    ? await getShopsByLocation(defaultLocation.documentId)
    : [];

  return (
    <MainLayout
      locations={locations}
      initialLocation={defaultLocation}
      shops={shops}
    />
  );
}
```

---

## Batch 8: Dynamic Routes (SEO)

### 8.1 City Page

Create `app/[city]/page.tsx`:
```typescript
import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation } from '@/lib/api/shops';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface CityPageProps {
  params: { city: string };
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const location = await getLocationBySlug(params.city.replace(/-/g, ' '));

  if (!location) return { title: 'City Not Found' };

  return {
    title: `Coffee Shops in ${location.name} | Filter`,
    description: `Discover the best specialty coffee shops in ${location.name}. Browse cafes, see reviews, and find your next favorite coffee spot.`,
    openGraph: {
      images: location.background_image?.url ? [location.background_image.url] : [],
    },
  };
}

export async function generateStaticParams() {
  const locations = await getAllLocations();
  return locations.map((location) => ({
    city: location.name.toLowerCase().replace(/\s+/g, '-'),
  }));
}

export default async function CityPage({ params }: CityPageProps) {
  const locations = await getAllLocations();
  const location = await getLocationBySlug(params.city.replace(/-/g, ' '));

  if (!location) notFound();

  const shops = await getShopsByLocation(location.documentId);

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
    />
  );
}
```

### 8.2 Area Page

Create `app/[city]/[area]/page.tsx`:
```typescript
import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation } from '@/lib/api/shops';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface AreaPageProps {
  params: { city: string; area: string };
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const areaName = params.area.replace(/-/g, ' ');
  const cityName = params.city.replace(/-/g, ' ');

  return {
    title: `Coffee Shops in ${areaName}, ${cityName} | Filter`,
    description: `Find specialty coffee in ${areaName}, ${cityName}. Browse local cafes, roasters, and coffee spots.`,
  };
}

export default async function AreaPage({ params }: AreaPageProps) {
  const locations = await getAllLocations();
  const location = await getLocationBySlug(params.city.replace(/-/g, ' '));

  if (!location) notFound();

  const allShops = await getShopsByLocation(location.documentId);

  // Filter to just this area
  const areaName = params.area.replace(/-/g, ' ');
  const shops = allShops.filter(
    (shop) =>
      (shop.city_area?.name ?? shop.cityArea?.name)?.toLowerCase() === areaName.toLowerCase()
  );

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
    />
  );
}
```

### 8.3 Shop Page

Create `app/[city]/[area]/[shop]/page.tsx`:
```typescript
import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation, getShopBySlug, getAllShops } from '@/lib/api/shops';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface ShopPageProps {
  params: { city: string; area: string; shop: string };
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const shop = await getShopBySlug(params.shop);

  if (!shop) return { title: 'Shop Not Found' };

  const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? '';
  const cityName = shop.location?.name ?? '';

  return {
    title: `${shop.name} - ${areaName}, ${cityName} | Filter Coffee`,
    description: shop.brand?.description ?? `Visit ${shop.name} for specialty coffee in ${areaName}, ${cityName}. ${shop.address ?? ''}`,
    openGraph: {
      images: shop.featured_image?.url ? [shop.featured_image.url] : [],
    },
  };
}

export async function generateStaticParams() {
  const shops = await getAllShops();
  return shops
    .filter((shop) => shop.location && (shop.city_area || shop.cityArea) && shop.slug)
    .map((shop) => ({
      city: shop.location!.name.toLowerCase().replace(/\s+/g, '-'),
      area: (shop.city_area?.name ?? shop.cityArea?.name ?? '').toLowerCase().replace(/\s+/g, '-'),
      shop: shop.slug!,
    }));
}

export default async function ShopPage({ params }: ShopPageProps) {
  const locations = await getAllLocations();
  const location = await getLocationBySlug(params.city.replace(/-/g, ' '));
  const shop = await getShopBySlug(params.shop);

  if (!location || !shop) notFound();

  const shops = await getShopsByLocation(location.documentId);

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
      initialShop={shop}
    />
  );
}
```

---

## Batch 9: Privacy & Terms Pages

### 9.1 Privacy Policy

Create `app/privacy/page.tsx`:
```typescript
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Filter Coffee',
  description: 'Privacy Policy for Filter Coffee',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-accent hover:text-secondary transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-semibold text-contrastBlock mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none text-text space-y-6">
          {/* Copy content from existing PrivacyPolicy.tsx */}
          <p className="text-textSecondary">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          {/* ... sections ... */}
        </div>
      </div>
    </div>
  );
}
```

### 9.2 Terms & Conditions

Create `app/terms/page.tsx` (similar structure to privacy page)

---

## Batch 10: Geolocation & Nearby Mode

### 10.1 Geolocation Hook

Create `lib/hooks/useGeolocation.ts`:
```typescript
'use client';

import { useState, useCallback } from 'react';

interface GeolocationState {
  coordinates: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    isLoading: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        setState({
          coordinates: null,
          error: error.message,
          isLoading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  return { ...state, requestLocation };
}
```

### 10.2 Nearby Shops Hook

Create `lib/hooks/useNearbyShops.ts`:
```typescript
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
```

---

## Batch 11: Install Icons & Final Polish

### 11.1 Install Lucide Icons

```bash
npm install lucide-react
```

### 11.2 Add Sitemap

Create `app/sitemap.ts`:
```typescript
import { MetadataRoute } from 'next';
import { getAllShops } from '@/lib/api/shops';
import { getAllLocations } from '@/lib/api/locations';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://filter.coffee';

  const locations = await getAllLocations();
  const shops = await getAllShops();

  const locationUrls = locations.map((location) => ({
    url: `${baseUrl}/${location.name.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const shopUrls = shops
    .filter((shop) => shop.location && (shop.city_area || shop.cityArea) && shop.slug)
    .map((shop) => ({
      url: `${baseUrl}/${shop.location!.name.toLowerCase().replace(/\s+/g, '-')}/${(shop.city_area?.name ?? shop.cityArea?.name ?? '').toLowerCase().replace(/\s+/g, '-')}/${shop.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...locationUrls,
    ...shopUrls,
  ];
}
```

### 11.3 Run & Test

```bash
npm run dev
```

Open http://localhost:3000

---

## Summary Checklist

- [ ] **Batch 1:** Project setup (Next.js, deps, env, Tailwind)
- [ ] **Batch 2:** API foundation (types, client, services)
- [ ] **Batch 3:** Providers & base layout
- [ ] **Batch 4:** Sidebar components
- [ ] **Batch 5:** Map components
- [ ] **Batch 6:** Shop drawer components
- [ ] **Batch 7:** Footer & main page
- [ ] **Batch 8:** Dynamic routes (SEO)
- [ ] **Batch 9:** Privacy & terms pages
- [ ] **Batch 10:** Geolocation & nearby mode
- [ ] **Batch 11:** Icons, sitemap, final polish

---

## Reference Files

- **Types:** `/Users/jonwillington/filter-expo/src/types/index.ts`
- **API Services:** `/Users/jonwillington/filter-expo/src/api/services/`
- **Layout CSS:** `/Users/jonwillington/deel-hx-map/src/App.css`
- **Mapbox Hook:** `/Users/jonwillington/deel-hx-map/src/hooks/useMap.js`
