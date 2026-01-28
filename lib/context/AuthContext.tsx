'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getFirebaseDisplayName = useCallback((firebaseUser: User): string => {
    const providerDisplayName =
      firebaseUser.providerData.find((provider) => provider.displayName)?.displayName || null;

    if (providerDisplayName && providerDisplayName.trim().length > 0) {
      return providerDisplayName;
    }

    if (firebaseUser.displayName && firebaseUser.displayName.trim().length > 0) {
      return firebaseUser.displayName;
    }

    if (firebaseUser.email && firebaseUser.email.includes('@')) {
      return firebaseUser.email.split('@')[0];
    }

    return 'Filter friend';
  }, []);

  const ensurePersonalDetails = useCallback(async (firebaseUser: User, profile: UserProfile) => {
    try {
      const updates: Partial<Pick<UserProfile, 'displayName' | 'timezone' | 'photoURL'>> = {};
      const providerDisplayName = getFirebaseDisplayName(firebaseUser);

      if (!profile.displayName || (providerDisplayName && providerDisplayName !== profile.displayName)) {
        updates.displayName = providerDisplayName;
      }

      const ssoPhotoURL = firebaseUser.photoURL;
      if (ssoPhotoURL && !profile.photoURL) {
        updates.photoURL = ssoPhotoURL;
      }

      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      if (deviceTimezone && profile.timezone !== deviceTimezone) {
        updates.timezone = deviceTimezone;
      }

      if (Object.keys(updates).length > 0) {
        await userService.updateUserProfile(firebaseUser.uid, updates);
        const refreshedProfile = await userService.getUserProfile(firebaseUser.uid);
        setUserProfile(refreshedProfile);
      }
    } catch (error) {
      console.error('Error ensuring personal details:', error);
    }
  }, [getFirebaseDisplayName]);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          let profile = await userService.getUserProfile(firebaseUser.uid);

          if (!profile) {
            const displayName = getFirebaseDisplayName(firebaseUser);
            await userService.createUserProfile(
              firebaseUser.uid,
              firebaseUser.email || '',
              displayName,
              firebaseUser.photoURL || undefined
            );
            profile = await userService.getUserProfile(firebaseUser.uid);
          }

          setUserProfile(profile);

          if (profile) {
            await ensurePersonalDetails(firebaseUser, profile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [getFirebaseDisplayName, ensurePersonalDetails]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      throw error;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      await authService.signInWithApple();
    } catch (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('No user signed in');
    const uid = user.uid;

    await authService.deleteAccount();
    await userService.deleteUserProfile(uid);

    setUser(null);
    setUserProfile(null);
  }, [user]);

  const refreshUserProfile = useCallback(async () => {
    if (!user) return;
    const profile = await userService.getUserProfile(user.uid);
    setUserProfile(profile);
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithApple,
    signOut,
    deleteAccount,
    refreshUserProfile,
  }), [user, userProfile, loading, signInWithGoogle, signInWithApple, signOut, deleteAccount, refreshUserProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
