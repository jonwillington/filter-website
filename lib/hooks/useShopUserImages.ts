'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserImagesByShop } from '../api/userImages';
import { UserImage } from '../types';
import { getMockPhotos } from '../utils/mockData';

export function useShopUserImages(shopDocumentId: string | undefined, shopId?: number) {
  return useQuery<UserImage[]>({
    queryKey: ['shop-user-images', shopDocumentId],
    queryFn: async () => {
      // Check for mock data first (dev only)
      const mockPhotos = getMockPhotos(shopId?.toString() || '', shopDocumentId!);
      if (mockPhotos) {
        console.log('[useShopUserImages] Using mock photos for', shopDocumentId);
        return mockPhotos;
      }

      return getUserImagesByShop(shopDocumentId!);
    },
    enabled: !!shopDocumentId,
    staleTime: 60 * 1000, // 1 minute
  });
}
