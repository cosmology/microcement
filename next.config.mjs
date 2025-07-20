/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  basePath: "/microcement",
  assetPrefix: "/microcement",
  transpilePackages: ['geist'],
}

export default nextConfig
