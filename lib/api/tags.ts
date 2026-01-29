// Client-safe tags API (no Node.js fs imports)

export interface Tag {
  id: string;
  label: string;
  description?: string;
  slug?: string;
}

type StrapiTagEntry = {
  id: number;
  documentId?: string;
  name?: string;
  label?: string;
  title?: string;
  description?: string | null;
  slug?: string | null;
};

function normalizeTag(entry: StrapiTagEntry): Tag | null {
  if (!entry) return null;

  const id = entry.documentId || String(entry.id);
  const rawLabel = entry.name || entry.label || entry.title || '';

  if (!id && !rawLabel) return null;

  // Title case the label
  const label = rawLabel
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word)
    .join(' ')
    .trim();

  return {
    id,
    label: label || `Tag ${entry.id}`,
    description: entry.description || undefined,
    slug: entry.slug || undefined,
  };
}

export const FALLBACK_TAGS: Tag[] = [
  { id: 'specialty-coffee', label: 'Specialty Coffee' },
  { id: 'single-origin', label: 'Single Origin' },
  { id: 'third-wave', label: 'Third Wave' },
  { id: 'roastery', label: 'Roastery' },
  { id: 'brunch', label: 'Brunch' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'pastries', label: 'Pastries' },
  { id: 'vegan-options', label: 'Vegan Options' },
  { id: 'gluten-free', label: 'Gluten Free' },
  { id: 'outdoor-seating', label: 'Outdoor Seating' },
  { id: 'pet-friendly', label: 'Pet Friendly' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'laptop-friendly', label: 'Laptop Friendly' },
  { id: 'good-for-groups', label: 'Good For Groups' },
  { id: 'date-spot', label: 'Date Spot' },
  { id: 'quick-service', label: 'Quick Service' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimalist', label: 'Minimalist' },
].sort((a, b) => a.label.localeCompare(b.label));

import { strapiGetAll } from './strapiClient';

// Simple in-memory cache for client-side
let cachedTags: Tag[] | null = null;

export async function getAllTags(): Promise<Tag[]> {
  // Return cached if available
  if (cachedTags) return cachedTags;

  try {
    const rawTags = await strapiGetAll<StrapiTagEntry>('/tags', undefined, {
      revalidate: 300,
    });

    const tags: Tag[] = rawTags
      .map((entry) => normalizeTag(entry))
      .filter((tag): tag is Tag => Boolean(tag))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (tags.length > 0) {
      cachedTags = tags;
      return tags;
    }

    return FALLBACK_TAGS;
  } catch (error) {
    console.error('[tags] Failed to fetch tags:', error);
    return FALLBACK_TAGS;
  }
}
