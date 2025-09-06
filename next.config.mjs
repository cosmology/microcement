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
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: false },
    trailingSlash: false
  },
  // No basePath, no assetPrefix, no output: 'export'
  // Add any other config you need here
};

export default withNextIntl(nextConfig);
