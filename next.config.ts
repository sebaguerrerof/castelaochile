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
// WebKit upgrades even localhost assets to HTTPS. The isolated HTTP QA server
// has no TLS; keep the production directive unless all three QA guards match.
const isolatedHttpQA = process.env.CARE_LOCAL_QA === "true"
  && process.env.NEXT_PUBLIC_SITE_URL === "http://localhost:3450"
  && supabaseOrigin === "http://127.0.0.1:54421";
const connectSources = ["'self'", supabaseOrigin].filter(Boolean).join(" ");
const imageSources = ["'self'", "data:", "blob:", supabaseOrigin].filter(Boolean).join(" ");
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV === "development" ? "'unsafe-eval'" : null,
].filter(Boolean).join(" ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {"/admin/seguimiento/informes/*": ["./public/brand/instituto-castelao-horizontal-manual-preview.png"]},
  reactStrictMode: true,
  logging: {
    // Next 16 logs Server Function arguments by default in dev; forms can contain private text/passwords.
    serverFunctions: false,
    browserToTerminal: false,
    incomingRequests: { ignore: [/^\/(pacientes|api\/pacientes|auth|admin)(\/|\?|$)/i] },
  },
  experimental: {
    authInterrupts: true,
    // Bound workers for local review builds without changing hosted defaults.
    ...((process.env.CARE_LOCAL_QA === "true" || process.env.CMS_EDITORIAL_LOCAL_REVIEW === "true") ? { cpus: 2 } : {}),
    ...(process.env.CMS_EDITORIAL_LOCAL_REVIEW === "true" ? { webpackMemoryOptimizations: true } : {}),
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src ${imageSources}; connect-src ${connectSources}; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; font-src 'self' data:${isolatedHttpQA ? "" : "; upgrade-insecure-requests"}` },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }, ...["/pacientes/:path*","/api/pacientes/:path*","/auth/:path*"].map(source=>({source,headers:[
      {key:"Cache-Control",value:"private, no-store, max-age=0"},
      {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
      {key:"Referrer-Policy",value:"no-referrer"},
    ]}))];
  },
  // Lets CI or a local validation run build beside an active dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
