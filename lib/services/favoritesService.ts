import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore/lite';
import { db } from '../config/firebase';
import { Favorite } from '../types/auth';

class FavoritesService {
  private readonly COLLECTION = 'favorites';

  async addFavorite(userId: string, shopId: string, shopName: string): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const favoriteId = `${userId}_${shopId}`;
      const favoriteRef = doc(db, this.COLLECTION, favoriteId);

      await setDoc(favoriteRef, {
        id: favoriteId,
        userId,
        shopId,
        shopName,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw new Error('Failed to add favorite');
    }
  }

  async removeFavorite(userId: string, shopId: string): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const favoriteId = `${userId}_${shopId}`;
      const favoriteRef = doc(db, this.COLLECTION, favoriteId);

      await deleteDoc(favoriteRef);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw new Error('Failed to remove favorite');
    }
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const favoritesRef = collection(db, this.COLLECTION);
      const q = query(favoritesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          userId: data.userId,
          shopId: data.shopId,
          shopName: data.shopName,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
        };
      });
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw new Error('Failed to get favorites');
    }
  }

  async isFavorited(userId: string, shopId: string): Promise<boolean> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const favoriteId = `${userId}_${shopId}`;
      const favoriteRef = doc(db, this.COLLECTION, favoriteId);
      const snapshot = await getDoc(favoriteRef);

      return snapshot.exists();
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }
}

export const favoritesService = new FavoritesService();
