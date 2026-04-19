import { z } from "zod"

export const PROJECT_STATUSES = ["active", "paused", "completed", "cancelled"] as const
export const STAGE_STATUSES = ["pending", "in_progress", "completed", "delayed"] as const
export const MEMBER_ROLES = ["analyst", "consultant", "reviewer"] as const

export const projectSchema = z.object({
  name: z.string().min(3, "Nome obrigatório"),
  description: z.string().optional(),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  sicarCode: z.string().optional(),
  municipality: z.string().optional(),
  state: z.string().length(2).optional(),
  areaHectares: z.number().positive().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
})

export const stageSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  order: z.number().int().min(1),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(STAGE_STATUSES).default("pending"),
})

export const memberSchema = z.object({
  userId: z.string(),
  role: z.enum(MEMBER_ROLES).default("analyst"),
})

export type ProjectInput = z.infer<typeof projectSchema>
export type StageInput = z.infer<typeof stageSchema>
export type MemberInput = z.infer<typeof memberSchema>
