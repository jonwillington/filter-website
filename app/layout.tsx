import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import 'mapbox-gl/dist/mapbox-gl.css';
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
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-88PDMJRDKT"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-88PDMJRDKT');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
