import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { viabilityReports } from "@/lib/db/schema"
import { z } from "zod"
import { withErrorHandling } from "@/lib/api/errors"

const updateSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["draft", "review", "approved", "published"]).optional(),
  conclusion: z.string().optional(),
  geospatialScore: z.number().optional(),
  vegetationScore: z.number().optional(),
  consultantScore: z.number().optional(),
  finalScore: z.number().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  isPublished: z.boolean().optional(),
})

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const db = getDb()
  const [report] = await db.select().from(viabilityReports).where(eq(viabilityReports.id, Number(id))).limit(1)
  if (!report) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(report)
})

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.isPublished) updates.publishedAt = new Date()
  if (parsed.data.geospatialScore !== undefined) updates.geospatialScore = String(parsed.data.geospatialScore)
  if (parsed.data.vegetationScore !== undefined) updates.vegetationScore = String(parsed.data.vegetationScore)
  if (parsed.data.consultantScore !== undefined) updates.consultantScore = String(parsed.data.consultantScore)
  if (parsed.data.finalScore !== undefined) updates.finalScore = String(parsed.data.finalScore)

  await db.update(viabilityReports).set(updates).where(eq(viabilityReports.id, Number(id)))
  return NextResponse.json({ success: true })
})
