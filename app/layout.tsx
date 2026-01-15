import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Filter - Discover Specialty Coffee',
  description: 'Find the best specialty coffee shops around the world. Browse cafes, see reviews, and find your next favorite coffee spot.',
  keywords: ['coffee', 'specialty coffee', 'cafe', 'coffee shop', 'espresso', 'filter coffee'],
  openGraph: {
    title: 'Filter - Discover Specialty Coffee',
    description: 'Find the best specialty coffee shops around the world.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
