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
