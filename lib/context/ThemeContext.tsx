'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { userService } from '../services/userService';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setSystemTheme(getSystemTheme());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Load theme from user preferences
  useEffect(() => {
    if (userProfile?.preferences?.themeMode) {
      setThemeModeState(userProfile.preferences.themeMode as ThemeMode);
    }
    setIsLoading(false);
  }, [userProfile]);

  // Calculate effective theme
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;

  // Apply theme class to document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effectiveTheme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);

    // Persist to Firestore if logged in
    if (user?.uid) {
      try {
        await userService.updateUserPreferences(user.uid, { themeMode: mode });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  }, [user?.uid]);

  return (
    <ThemeContext.Provider value={{ themeMode, effectiveTheme, setThemeMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
