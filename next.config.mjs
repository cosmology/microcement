import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// Get IP from environment or .env
const getDevIP = () => {
  // Try to extract IP from NEXT_PUBLIC_SUPABASE_URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const match = supabaseUrl.match(/http:\/\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) return match[1];
  }
  return '192.168.0.33'; // Fallback
};

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
    localPatterns: [
      {
        pathname: '/images/**',
        search: '',
      },
      {
        pathname: '/public/**',
        search: '',
      },
      {
        pathname: '/**',
        search: '**',
      },
    ],
  },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  trailingSlash: false,
  // Force hot reload to work
  devIndicators: {
    position: 'bottom-left',
  },
  // Allow cross-origin requests from development IP
  allowedDevOrigins: [getDevIP()],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const shouldPoll = process.env.WATCHPACK_POLLING !== 'false';
      config.watchOptions = {
        poll: shouldPoll ? 1000 : false,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/tmp/**',
          '**/playwright/**',
          '**/test-results/**',
          '**/e2e/test-output/**',
        ],
      }
    }
    return config
  },
};

export default withNextIntl(nextConfig);
