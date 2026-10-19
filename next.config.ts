import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/metrics',
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};

export default nextConfig;
