import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.56.1', 'localhost'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
