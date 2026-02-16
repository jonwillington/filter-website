'use client';

import { useQuery } from '@tanstack/react-query';
import { Bean, Brand } from '@/lib/types';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchBrands(): Promise<Brand[]> {
  // D1 API route (no beans nested — brands table only)
  try {
    const response = await fetch('/api/v2/brands');
    if (response.ok) {
      return response.json();
    }
  } catch {}
  // Fallback to static JSON (still has beans nested from prefetch)
  try {
    const response = await fetch('/data/brands.json');
    if (response.ok) {
      return response.json();
    }
  } catch {}
  const response = await fetch('/api/data/brands');
  if (!response.ok) {
    throw new Error(`Failed to fetch brands: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Hook that returns a Set of brand documentIds that have beans.
 * Useful for checking clickability before opening a brand profile.
 */
export function useBrandsWithBeans() {
  return useQuery<Set<string>>({
    queryKey: ['brands-with-beans'],
    queryFn: async () => {
      const brands = await fetchBrands();
      const result = new Set<string>();
      for (const brand of brands) {
        if (brand.beans && (brand.beans as Bean[]).length > 0) {
          result.add(brand.documentId);
        }
      }
      return result;
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to fetch beans for a specific brand.
 * First tries the shop detail endpoint (which includes beans),
 * then falls back to static brands JSON.
 */
export function useBeansByBrand(brandDocumentId: string | null | undefined, enabled = true) {
  return useQuery<Bean[]>({
    queryKey: ['beans', 'brand', brandDocumentId],
    queryFn: async () => {
      if (!brandDocumentId) return [];

      const brands = await fetchBrands();
      const brand = brands.find(b => b.documentId === brandDocumentId);

      return (brand?.beans as Bean[]) || [];
    },
    enabled: enabled && !!brandDocumentId,
    staleTime: STALE_TIME,
  });
}
