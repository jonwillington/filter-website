/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
    ],
  },
  transpilePackages: ['mapbox-gl'],
}

// Only add output: 'export' for full production builds
// Use `npm run build:dev` for faster dev builds without static generation
const isFullBuild = process.env.NODE_ENV === 'production' && !process.env.SKIP_STATIC_EXPORT;
if (isFullBuild) {
  nextConfig.output = 'export'
}

module.exports = nextConfig
