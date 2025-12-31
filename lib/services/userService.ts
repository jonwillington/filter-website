import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, UserPreferences, AICachedSummary } from '../types/auth';

class UserService {
  private readonly COLLECTION = 'users';

  /**
   * Create a new user profile in Firestore
   */
  async createUserProfile(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
  ): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);
      const userData = {
        uid,
        email,
        displayName,
        photoURL: photoURL || null,
        preferredName: null,
        country: null,
        countryDetectedAt: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preferences: {
          themeType: 'normal',
          themeMode: 'light',
          locationMode: 'gps',
          preferredBrewMethods: [],
          preferredTags: [],
          preferIndependentOnly: false,
          hiddenBrandIds: [],
          personalizationComplete: false,
          preferencesAlertDismissed: false,
        } as UserPreferences,
      };

      await setDoc(userRef, userData);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Get user profile by uid
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const data = userSnap.data();

      let preferences = data.preferences;
      if (preferences?.aiSummary?.generatedAt) {
        preferences = {
          ...preferences,
          aiSummary: {
            ...preferences.aiSummary,
            generatedAt: (preferences.aiSummary.generatedAt as Timestamp).toDate(),
          },
        };
      }

      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL || undefined,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
        preferences,
        preferredName: data.preferredName ?? null,
        country: data.country ?? null,
        countryDetectedAt: data.countryDetectedAt
          ? (data.countryDetectedAt as Timestamp).toDate()
          : null,
        timezone: data.timezone ?? null,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    uid: string,
    updates: Partial<
      Pick<UserProfile, 'displayName' | 'photoURL' | 'country' | 'countryDetectedAt' | 'timezone' | 'about'>
    >,
  ): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);
      const { countryDetectedAt, timezone, photoURL, about, ...rest } = updates;
      const payload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        preferredName: deleteField(),
      };

      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) {
          payload[key] = value;
        }
      });

      if ('photoURL' in updates) {
        payload.photoURL = photoURL ? photoURL : deleteField();
      }

      if ('about' in updates) {
        payload.about = about ? about : deleteField();
      }

      if (countryDetectedAt !== undefined) {
        payload.countryDetectedAt =
          countryDetectedAt instanceof Date ? Timestamp.fromDate(countryDetectedAt) : countryDetectedAt;
      }

      if (timezone !== undefined) {
        payload.timezone = timezone;
      }

      await updateDoc(userRef, payload);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Delete a user profile
   */
  async deleteUserProfile(uid: string): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw new Error('Failed to delete user profile');
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    uid: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const currentPreferences = userSnap.data().preferences || {};
      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        ...preferences,
      };

      await updateDoc(userRef, {
        preferences: updatedPreferences,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(uid: string): Promise<UserPreferences | null> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      let preferences = userSnap.data().preferences || null;

      if (preferences?.aiSummary?.generatedAt) {
        preferences = {
          ...preferences,
          aiSummary: {
            ...preferences.aiSummary,
            generatedAt: (preferences.aiSummary.generatedAt as Timestamp).toDate(),
          },
        };
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to get preferences');
    }
  }

  /**
   * Update AI summary cache in user preferences
   */
  async updateAISummaryCache(
    uid: string,
    summary: Omit<AICachedSummary, 'generatedAt'> & { generatedAt: Date }
  ): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const currentPreferences = userSnap.data().preferences || {};

      const summaryToSave = {
        ...summary,
        generatedAt: Timestamp.fromDate(summary.generatedAt),
      };

      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        aiSummary: summaryToSave as any,
      };

      await updateDoc(userRef, {
        preferences: updatedPreferences,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating AI summary cache:', error);
      throw new Error('Failed to update AI summary cache');
    }
  }

  /**
   * Clear AI summary cache from user preferences
   */
  async clearAISummaryCache(uid: string): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const userRef = doc(db, this.COLLECTION, uid);

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const currentPreferences = userSnap.data().preferences || {};
      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        aiSummary: null,
      };

      await updateDoc(userRef, {
        preferences: updatedPreferences,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error clearing AI summary cache:', error);
      throw new Error('Failed to clear AI summary cache');
    }
  }
}

export const userService = new UserService();
