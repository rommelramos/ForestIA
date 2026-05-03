import { z } from "zod"

const envSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

type Env = z.infer<typeof envSchema>

function validateEnv(): Partial<Env> {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map(i => i.path.join(".")).join(", ")
    if (process.env.NODE_ENV === "production") {
      // Hard-fail at startup so a misconfigured deployment never serves traffic.
      throw new Error(`[env] Variáveis de ambiente inválidas ou ausentes: ${missing}`)
    }
    // In dev/test, log and continue so the setup wizard still works without a DB.
    console.warn(`[env] Variáveis de ambiente ausentes (ignorado em dev): ${missing}`)
    return {}
  }
  return parsed.data
}

export const env = validateEnv()

export function isDbConfigured(): boolean {
  return !!(
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD !== undefined &&
    process.env.DB_NAME
  )
}
