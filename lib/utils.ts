import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function deslugify(slug: string): string {
  return slug.replace(/-/g, ' ');
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function getMediaUrl(media: { url?: string } | string | null | undefined): string | null {
  if (!media) return null;
  if (typeof media === 'string') return media;
  return media.url || null;
}

interface ShopForDisplayName {
  name: string;
  prefName?: string | null;
  independent?: boolean;
  brand?: { name?: string } | null;
}

export function getShopDisplayName(shop: ShopForDisplayName): string {
  // For non-independent shops with a brand, construct "Brand · PrefName"
  if (!shop.independent && shop.brand?.name && shop.prefName) {
    return `${shop.brand.name} · ${shop.prefName}`;
  }
  // Otherwise use the shop name as-is
  return shop.name;
}

export function getShopSlug(shop: ShopForDisplayName & { slug?: string | null }): string {
  // Use existing slug if available
  if (shop.slug) {
    return shop.slug;
  }

  // For non-independent shops with a brand, construct "brand-prefname"
  if (!shop.independent && shop.brand?.name && shop.prefName) {
    return slugify(`${shop.brand.name} ${shop.prefName}`);
  }

  // Otherwise slugify the shop name as-is
  return slugify(shop.name);
}

// Brand/Shop merge utilities - shop values override brand defaults
interface MergeableEntity {
  has_wifi?: boolean;
  has_food?: boolean;
  has_outdoor_space?: boolean;
  is_pet_friendly?: boolean;
  has_espresso?: boolean;
  has_filter_coffee?: boolean;
  has_v60?: boolean;
  has_chemex?: boolean;
  has_aeropress?: boolean;
  has_french_press?: boolean;
  has_cold_brew?: boolean;
  has_batch_brew?: boolean;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  website?: string | null;
  phone?: string | null;
  description?: string | null;
  story?: string | null;
}

export function getMergedValue<T>(
  shopValue: T | undefined | null,
  brandValue: T | undefined | null
): T | null {
  if (shopValue !== undefined && shopValue !== null) return shopValue;
  if (brandValue !== undefined && brandValue !== null) return brandValue;
  return null;
}

export function getMergedBoolean(
  shopValue: boolean | undefined,
  brandValue: boolean | undefined
): boolean {
  if (shopValue !== undefined) return shopValue;
  if (brandValue !== undefined) return brandValue;
  return false;
}

interface ShopWithBrand {
  description?: string | null;
  brand?: {
    description?: string | null;
    story?: string | null;
  } | null;
}

export function getShopDescription(shop: ShopWithBrand): string | null {
  // Fallback chain: shop.description → brand.description → brand.story
  if (shop.description) return shop.description;
  if (shop.brand?.description) return shop.brand.description;
  if (shop.brand?.story) return shop.brand.story;
  return null;
}

interface ShopForContact {
  website?: string | null;
  phone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  brand?: {
    website?: string | null;
    phone?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
  } | null;
}

export function getMergedContact(shop: ShopForContact) {
  return {
    website: getMergedValue(shop.website, shop.brand?.website),
    phone: getMergedValue(shop.phone, shop.brand?.phone),
    instagram: getMergedValue(shop.instagram, shop.brand?.instagram),
    facebook: getMergedValue(shop.facebook, shop.brand?.facebook),
    tiktok: getMergedValue(shop.tiktok, shop.brand?.tiktok),
  };
}

interface ShopForAmenities {
  has_wifi?: boolean;
  has_food?: boolean;
  has_outdoor_space?: boolean;
  is_pet_friendly?: boolean;
  has_kitchen?: boolean;
  brand?: {
    has_wifi?: boolean;
    has_food?: boolean;
    has_outdoor_space?: boolean;
    is_pet_friendly?: boolean;
  } | null;
}

export function getMergedAmenities(shop: ShopForAmenities) {
  return {
    has_wifi: getMergedBoolean(shop.has_wifi, shop.brand?.has_wifi),
    has_food: getMergedBoolean(shop.has_food ?? shop.has_kitchen, shop.brand?.has_food),
    has_outdoor_space: getMergedBoolean(shop.has_outdoor_space, shop.brand?.has_outdoor_space),
    is_pet_friendly: getMergedBoolean(shop.is_pet_friendly, shop.brand?.is_pet_friendly),
  };
}

interface ShopForBrewMethods {
  has_espresso?: boolean;
  has_filter_coffee?: boolean;
  has_v60?: boolean;
  has_chemex?: boolean;
  has_aeropress?: boolean;
  has_french_press?: boolean;
  has_cold_brew?: boolean;
  has_batch_brew?: boolean;
  has_slow_bar?: boolean;
  brand?: {
    has_espresso?: boolean;
    has_filter_coffee?: boolean;
    has_v60?: boolean;
    has_chemex?: boolean;
    has_aeropress?: boolean;
    has_french_press?: boolean;
    has_cold_brew?: boolean;
    has_batch_brew?: boolean;
  } | null;
}

export function getMergedBrewMethods(shop: ShopForBrewMethods) {
  return {
    has_espresso: getMergedBoolean(shop.has_espresso, shop.brand?.has_espresso),
    has_filter_coffee: getMergedBoolean(shop.has_filter_coffee, shop.brand?.has_filter_coffee),
    has_v60: getMergedBoolean(shop.has_v60, shop.brand?.has_v60),
    has_chemex: getMergedBoolean(shop.has_chemex, shop.brand?.has_chemex),
    has_aeropress: getMergedBoolean(shop.has_aeropress, shop.brand?.has_aeropress),
    has_french_press: getMergedBoolean(shop.has_french_press, shop.brand?.has_french_press),
    has_cold_brew: getMergedBoolean(shop.has_cold_brew, shop.brand?.has_cold_brew),
    has_batch_brew: getMergedBoolean(shop.has_batch_brew, shop.brand?.has_batch_brew),
    has_slow_bar: shop.has_slow_bar ?? false,
  };
}

export function countBrewMethods(shop: ShopForBrewMethods): number {
  const methods = getMergedBrewMethods(shop);
  return Object.values(methods).filter(Boolean).length;
}
