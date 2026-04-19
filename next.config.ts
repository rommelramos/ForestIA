import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["mysql2", "bcryptjs"],
  outputFileTracingIncludes: {
    "/api/**": ["./drizzle/**"],
  },
}

export default nextConfig
