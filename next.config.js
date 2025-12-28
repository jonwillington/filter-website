/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
    ],
  },
  transpilePackages: ['mapbox-gl'],
}

module.exports = nextConfig
