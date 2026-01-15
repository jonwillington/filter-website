import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore/lite';
import { db } from '@/lib/config/firebase';

/**
 * Hook to fetch user photo URL from Firebase
 */
export function useUserPhoto(userId: string | null) {
  const { data } = useQuery({
    queryKey: ['user-photo', userId],
    queryFn: async () => {
      if (!userId || !db) {
        return null;
      }

      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          return null;
        }

        const data = userSnap.data();
        return data.photoURL || null;
      } catch (error) {
        console.error('Error getting user photo:', error);
        return null;
      }
    },
    enabled: !!userId && !!db,
    staleTime: 1000 * 60 * 10, // 10 minutes - photos don't change frequently
  });

  return data;
}
