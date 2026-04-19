import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

export const adminSetupSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export const accessRequestSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  requestedRole: z.enum(["gerente", "funcionario", "cliente"]),
  justification: z.string().min(10, "Justificativa obrigatória (mín. 10 caracteres)"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type AdminSetupInput = z.infer<typeof adminSetupSchema>
export type AccessRequestInput = z.infer<typeof accessRequestSchema>
