import type { NextConfig } from "next"

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
}

export default nextConfig
