import type { NextConfig } from "next";

// The Next.js dev server proxies /api/* to the FastAPI backend so that the
// browser sees everything as same-origin. That means the httpOnly session
// cookie set by FastAPI just works, with no CORS/cookie-domain headaches.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
