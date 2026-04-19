import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projectStages } from "@/lib/db/schema"
import { stageSchema } from "@/modules/projects/schemas"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const db = getDb()
  const stages = await db.select().from(projectStages)
    .where(eq(projectStages.projectId, Number(id)))
    .orderBy(projectStages.order)
  return NextResponse.json(stages)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = stageSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const [result] = await db.insert(projectStages).values({
    ...parsed.data,
    projectId: Number(id),
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
  }).$returningId()

  return NextResponse.json({ success: true, id: result.id }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  await params
  const body = await req.json()
  const { stageId, ...updates } = body

  const db = getDb()
  await db.update(projectStages).set({
    ...updates,
    dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
    completedAt: updates.status === "completed" ? new Date() : undefined,
  }).where(eq(projectStages.id, Number(stageId)))

  return NextResponse.json({ success: true })
}
