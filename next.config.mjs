import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.idealwork.com', // Matches a specific hostname
        port: '', // Leave empty if no specific port is required
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  trailingSlash: false
};

export default withNextIntl(nextConfig);
