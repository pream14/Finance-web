/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Suppress noisy dev logs in production
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
