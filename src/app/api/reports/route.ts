import { NextRequest, NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { viabilityReports, projects, projectMembers } from "@/lib/db/schema"
import { z } from "zod"
import { withErrorHandling } from "@/lib/api/errors"

const createSchema = z.object({
  projectId: z.number(),
  title: z.string().min(3),
  content: z.record(z.string(), z.unknown()).optional(),
})

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("project")
  const db = getDb()

  let list
  if (projectId) {
    list = await db.select().from(viabilityReports)
      .where(eq(viabilityReports.projectId, Number(projectId)))
      .orderBy(desc(viabilityReports.version))
  } else {
    list = await db.select().from(viabilityReports).orderBy(desc(viabilityReports.createdAt))
  }

  return NextResponse.json(list)
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const existing = await db.select({ version: viabilityReports.version })
    .from(viabilityReports)
    .where(eq(viabilityReports.projectId, parsed.data.projectId))
    .orderBy(desc(viabilityReports.version))
    .limit(1)

  const nextVersion = (existing[0]?.version ?? 0) + 1

  const [result] = await db.insert(viabilityReports).values({
    projectId: parsed.data.projectId,
    title: parsed.data.title,
    version: nextVersion,
    content: parsed.data.content ?? {},
    status: "draft",
    createdBy: session.user.id,
  }).$returningId()

  return NextResponse.json({ success: true, id: result.id, version: nextVersion }, { status: 201 })
})
