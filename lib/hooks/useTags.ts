'use client';

import { useQuery } from '@tanstack/react-query';
import { Tag, FALLBACK_TAGS } from '@/lib/api/tags';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

async function fetchWithFallback<T>(staticPath: string, apiPath: string): Promise<T> {
  try {
    // Try static file first (served from CDN, very fast)
    const response = await fetch(staticPath);
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Static file not available, fall back to API
  }
  // Fall back to API route
  return fetchJSON<T>(apiPath);
}

// Normalize tags from Strapi format (raw data has name/label/title fields)
function normalizeTags(rawTags: unknown[]): Tag[] {
  if (!Array.isArray(rawTags)) return FALLBACK_TAGS;

  const tags: Tag[] = [];

  for (const entry of rawTags) {
    if (!entry || typeof entry !== 'object') continue;

    const e = entry as Record<string, unknown>;
    const id = (e.documentId as string) || String(e.id || '');
    const rawLabel = (e.name as string) || (e.label as string) || (e.title as string) || '';

    if (!id && !rawLabel) continue;

    // Title case the label
    const label = rawLabel
      .split(' ')
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word)
      .join(' ')
      .trim();

    tags.push({
      id,
      label: label || `Tag ${e.id}`,
      description: (e.description as string) || undefined,
      slug: (e.slug as string) || undefined,
    });
  }

  tags.sort((a, b) => a.label.localeCompare(b.label));

  return tags.length > 0 ? tags : FALLBACK_TAGS;
}

export function useTagsQuery() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const rawTags = await fetchWithFallback<unknown[]>('/data/tags.json', '/api/data/tags');
      return normalizeTags(rawTags);
    },
    staleTime: STALE_TIME,
  });
}

export function useTags() {
  const query = useTagsQuery();

  return {
    tags: query.data ?? FALLBACK_TAGS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
