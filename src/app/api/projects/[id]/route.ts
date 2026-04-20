import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, projectStages, users } from "@/lib/db/schema"
import { projectSchema } from "@/modules/projects/schemas"
import { withErrorHandling } from "@/lib/api/errors"

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const db = getDb()

  const [project] = await db.select().from(projects).where(eq(projects.id, Number(id))).limit(1)
  if (!project) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const stages = await db.select().from(projectStages).where(eq(projectStages.projectId, Number(id))).orderBy(projectStages.order)
  const members = await db
    .select({ id: projectMembers.id, role: projectMembers.role, userId: projectMembers.userId, name: users.name, email: users.email })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, Number(id)))

  return NextResponse.json({ ...project, stages, members })
})

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = projectSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  await db.update(projects).set({
    ...parsed.data,
    areaHectares: parsed.data.areaHectares?.toString(),
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    expectedEndDate: parsed.data.expectedEndDate ? new Date(parsed.data.expectedEndDate) : undefined,
  }).where(eq(projects.id, Number(id)))

  return NextResponse.json({ success: true })
})

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const db = getDb()
  await db.delete(projects).where(eq(projects.id, Number(id)))
  return NextResponse.json({ success: true })
})
