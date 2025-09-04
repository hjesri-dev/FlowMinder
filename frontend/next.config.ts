import type { NextConfig } from 'next';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
  },
  async rewrites() {
    return [
      {
        source: '/agenda',
        destination: `${backendUrl}/agenda_items`,
      },
    ];
  },
};

export default nextConfig;
