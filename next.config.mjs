import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.idealwork.com'],
  },
  // No basePath, no assetPrefix, no output: 'export'
  // Add any other config you need here
};

export default withNextIntl(nextConfig);
