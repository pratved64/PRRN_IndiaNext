import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/* calls to the FastAPI backend.
        // Change the destination port if your backend runs elsewhere.
        source: "/api/:path*",
        destination: "https://lw53f94s-8000.inc1.devtunnels.ms/api/:path*",
      },
    ];
  },
};

export default nextConfig;