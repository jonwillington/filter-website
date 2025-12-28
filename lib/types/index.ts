// Core types adapted from filter-expo

export interface MediaFormat {
  url?: string;
  width?: number;
  height?: number;
}

export interface MediaAsset {
  id?: number;
  documentId?: string;
  url?: string;
  formats?: Record<string, MediaFormat>;
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
  location?: {
    id?: number;
    documentId?: string;
    name?: string;
  };
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

export interface OpeningHoursPeriod {
  day: number;
  open: string;
  close: string;
}

export interface OpeningHours {
  periods?: OpeningHoursPeriod[];
  display?: string | null;
  today?: string | null;
  open_now?: boolean;
}

export interface Shop {
  id: number;
  documentId: string;
  name: string;
  prefName?: string | null;
  slug?: string | null;
  address?: string | null;
  coordinates?: { lat: number; lng: number } | null;
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
  is_pet_friendly?: boolean;
  independent?: boolean;

  // Ratings & Hours
  opening_hours?: string[] | OpeningHours | null;
  is_open?: boolean | null;
  google_rating?: number | null;
  google_review_count?: number | null;

  // Contact
  website?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
}

export interface NearbyShop {
  id: string;
  documentId?: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  distance_metres?: number;
  distance_meters?: number;
  city_area?: { name: string };
}

export interface NearbyShopsResponse {
  shops: NearbyShop[];
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
