const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare');

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Enable image optimization for faster loading
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'helpful-oasis-8bb949e05d.strapiapp.com',
      },
      {
        protocol: 'https',
        hostname: 'helpful-oasis-8bb949e05d.media.strapiapp.com',
      },
      {
        protocol: 'https',
        hostname: '**.strapiapp.com',
      },
      {
        protocol: 'https',
        hostname: 'hatscripts.github.io',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    // Use modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Minimize layout shift
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react', '@heroui/react', 'date-fns'],
  },
}

module.exports = nextConfig
