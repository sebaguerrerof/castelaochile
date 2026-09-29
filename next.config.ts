import type { NextConfig } from "next";

function trustedSupabaseOrigin() {
  try {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

const supabaseOrigin = trustedSupabaseOrigin();
const connectSources = ["'self'", supabaseOrigin].filter(Boolean).join(" ");
const imageSources = ["'self'", "data:", "blob:", supabaseOrigin].filter(Boolean).join(" ");
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV === "development" ? "'unsafe-eval'" : null,
].filter(Boolean).join(" ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { authInterrupts: true },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src ${imageSources}; connect-src ${connectSources}; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; upgrade-insecure-requests` },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  // Lets CI or a local validation run build beside an active dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
