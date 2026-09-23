import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets CI or a local validation run build beside an active dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
