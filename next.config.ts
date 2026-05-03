import type { NextConfig } from "next"

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
      "img-src 'self' data: blob: cdn.jsdelivr.net *.tile.openstreetmap.org *.arcgisonline.com gibs.earthdata.nasa.gov ows.mapbiomas.org terrabrasilis.dpi.inpe.br",
      "connect-src 'self' cdn.jsdelivr.net *.tile.openstreetmap.org *.arcgisonline.com gibs.earthdata.nasa.gov ows.mapbiomas.org terrabrasilis.dpi.inpe.br",
      "font-src 'self' cdn.jsdelivr.net",
      "frame-ancestors 'self'",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
]

const corsHeaders = [
  {
    key: "Access-Control-Allow-Origin",
    value: process.env.NEXT_PUBLIC_SITE_URL ?? "https://forestia.com.br",
  },
  {
    key: "Access-Control-Allow-Methods",
    value: "GET, POST, PUT, DELETE, OPTIONS",
  },
  {
    key: "Access-Control-Allow-Headers",
    value: "Content-Type, Authorization",
  },
  {
    key: "Access-Control-Max-Age",
    value: "86400",
  },
]

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these Node.js / CJS-only packages.
  // @google/earthengine is a large CJS module that must be required at runtime.
  serverExternalPackages: ["mysql2", "bcryptjs", "@google/earthengine"],
  outputFileTracingIncludes: {
    "/api/**": ["./drizzle/**"],
  },
  // Allow large GeoJSON bodies from shapefile uploads (up to 50 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/(.*)",
        headers: corsHeaders,
      },
    ]
  },
}

export default nextConfig
