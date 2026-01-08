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

const FALLBACK_TAGS: Tag[] = [
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

// Simple in-memory cache for client-side
let cachedTags: Tag[] | null = null;

export async function getAllTags(): Promise<Tag[]> {
  // Return cached if available
  if (cachedTags) return cachedTags;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/tags?pagination[pageSize]=200`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[tags] API Error:', response.statusText);
      return FALLBACK_TAGS;
    }

    const json = await response.json();
    const tags: Tag[] = (json.data || [])
      .map((entry: StrapiTagEntry) => normalizeTag(entry))
      .filter((tag: Tag | null): tag is Tag => Boolean(tag))
      .sort((a: Tag, b: Tag) => a.label.localeCompare(b.label));

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
