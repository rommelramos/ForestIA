import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["mysql2", "bcryptjs"],
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
