'use client';

import { HeroUIProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/lib/context/AuthContext';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { ShopDataProvider } from '@/lib/context/ShopDataContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <AuthProvider>
          <ThemeProvider>
            <ShopDataProvider>
              {children}
            </ShopDataProvider>
          </ThemeProvider>
        </AuthProvider>
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
