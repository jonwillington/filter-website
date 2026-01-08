import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { UserBadges } from '@/lib/types/auth';
import { getMockBadges } from '@/lib/utils/mockData';

/**
 * Hook to fetch user badges from Firebase
 */
export function useUserBadges(userId: string | null) {
  return useQuery({
    queryKey: ['user-badges', userId],
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      // Check for mock data first (dev only)
      const mockBadges = getMockBadges(userId);
      if (mockBadges) {
        console.log('[useUserBadges] Using mock badges for', userId);
        return mockBadges;
      }

      if (!db) {
        return null;
      }

      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          return null;
        }

        const data = userSnap.data();
        const badgesData = data.badges;

        if (!badgesData) {
          return null;
        }

        // Convert Firestore Timestamps to Dates
        const badges: UserBadges = {
          cityAreaBadges: (badgesData.cityAreaBadges || []).map((badge: any) => ({
            ...badge,
            earnedAt: badge.earnedAt ? (badge.earnedAt as Timestamp).toDate() : new Date(),
          })),
          cityBadges: (badgesData.cityBadges || []).map((badge: any) => ({
            ...badge,
            earnedAt: badge.earnedAt ? (badge.earnedAt as Timestamp).toDate() : new Date(),
          })),
          topContributor: {
            ...badgesData.topContributor,
            earnedAt: badgesData.topContributor?.earnedAt
              ? (badgesData.topContributor.earnedAt as Timestamp).toDate()
              : null,
          },
          earlyAdopter: {
            ...badgesData.earlyAdopter,
            earnedAt: badgesData.earlyAdopter?.earnedAt
              ? (badgesData.earlyAdopter.earnedAt as Timestamp).toDate()
              : null,
          },
          totalReviews: badgesData.totalReviews || 0,
          lastRecalculatedAt: badgesData.lastRecalculatedAt
            ? (badgesData.lastRecalculatedAt as Timestamp).toDate()
            : new Date(),
        };

        return badges;
      } catch (error: any) {
        // Handle permission errors gracefully - badges are optional
        if (error?.code === 'permission-denied') {
          return null;
        }
        console.error('Error getting user badges:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - badges don't change frequently
  });
}
