import { z } from "zod"

export const dbCredentialsSchema = z.object({
  host: z.string().min(1, "Host obrigatório"),
  port: z.number().int().min(1).max(65535),
  user: z.string().min(1, "Usuário obrigatório"),
  password: z.string(),
  database: z.string().min(1, "Nome do banco obrigatório"),
})

export type DbCredentialsInput = z.infer<typeof dbCredentialsSchema>

export const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  databaseExists: z.boolean().optional(),
})

export type TestConnectionResponse = z.infer<typeof testConnectionResponseSchema>

export const dbActionSchema = z.object({
  action: z.enum(["create", "regenerate"]),
  credentials: dbCredentialsSchema,
})

export type DbActionInput = z.infer<typeof dbActionSchema>
