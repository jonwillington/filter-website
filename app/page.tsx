import { HomeClient } from '@/components/home/HomeClient';

/**
 * Homepage - Static shell with client-side data loading.
 *
 * This page renders instantly with no server-side data fetching.
 * All data is loaded client-side via React Query, which:
 * - Fetches from edge-cached API routes
 * - Shows the map shell immediately
 * - Progressively adds markers as data arrives
 *
 * This approach reduces Time to First Paint from ~30s to <1s.
 */
export default function HomePage() {
  return <HomeClient />;
}
