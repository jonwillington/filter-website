'use client';

import { useQuery } from '@tanstack/react-query';
import { Bean, Brand } from '@/lib/types';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchBrandsJSON(): Promise<Brand[]> {
  try {
    // Try static file first (served from CDN, very fast)
    const response = await fetch('/data/brands.json');
    if (response.ok) {
      return response.json();
    }
  } catch (e) {
    // Static file not available
  }
  // Fall back to API route
  const response = await fetch('/api/data/brands');
  if (!response.ok) {
    throw new Error(`Failed to fetch brands: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Hook to fetch beans for a specific brand from prefetched data.
 * Beans are nested on brands in the prefetched data.
 */
export function useBeansByBrand(brandDocumentId: string | null | undefined, enabled = true) {
  return useQuery<Bean[]>({
    queryKey: ['beans', 'brand', brandDocumentId],
    queryFn: async () => {
      if (!brandDocumentId) return [];

      const brands = await fetchBrandsJSON();
      const brand = brands.find(b => b.documentId === brandDocumentId);

      // Beans are nested on the brand from prefetch
      return (brand?.beans as Bean[]) || [];
    },
    enabled: enabled && !!brandDocumentId,
    staleTime: STALE_TIME,
  });
}
