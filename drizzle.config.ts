import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST ?? "69.6.249.192",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "rommel34_forestia",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "rommel34_forestia",
  },
})
