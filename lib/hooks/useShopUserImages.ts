'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserImagesByShop } from '../api/userImages';
import { UserImage } from '../types';

export function useShopUserImages(shopDocumentId: string | undefined) {
  return useQuery<UserImage[]>({
    queryKey: ['shop-user-images', shopDocumentId],
    queryFn: () => getUserImagesByShop(shopDocumentId!),
    enabled: !!shopDocumentId,
    staleTime: 60 * 1000, // 1 minute
  });
}
