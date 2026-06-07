import type { NextConfig } from "next";

const API_PROXY_ORIGIN = process.env.API_PROXY_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
