import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Filter - Discover Specialty Coffee',
  description: 'Find the best specialty coffee shops around the world. Browse cafes, see reviews, and find your next favorite coffee spot.',
  keywords: ['coffee', 'specialty coffee', 'cafe', 'coffee shop', 'espresso', 'filter coffee'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
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
      <head>
        {/* Preload critical fonts to prevent FOUT */}
        <link
          rel="preload"
          href="/fonts/PPNeueYork-NormalMedium.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />

        {/* Preconnect to critical external origins */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://tiles.mapbox.com" />
        <link rel="preconnect" href="https://events.mapbox.com" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://tiles.mapbox.com" />

        {/* Preconnect to Strapi CMS */}
        <link rel="preconnect" href="https://helpful-oasis-8bb949e05d.strapiapp.com" />
        <link rel="preconnect" href="https://helpful-oasis-8bb949e05d.media.strapiapp.com" />
        <link rel="dns-prefetch" href="https://helpful-oasis-8bb949e05d.media.strapiapp.com" />

        {/* Prefetch Mapbox GL JS (defer loading) */}
        <link
          rel="prefetch"
          href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js"
          as="script"
        />
        <link
          rel="prefetch"
          href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css"
          as="style"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
