import { NextRequest, NextResponse } from "next/server"
import { eq, or, inArray } from "drizzle-orm"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers } from "@/lib/db/schema"
import { projectSchema } from "@/modules/projects/schemas"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const db = getDb()
  const role = session.user.role
  const userId = session.user.id

  let list
  if (["admin", "gerente"].includes(role)) {
    list = await db.select().from(projects).orderBy(projects.createdAt)
  } else if (role === "funcionario") {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
    const ids = memberOf.map((m) => m.projectId)
    list = ids.length
      ? await db.select().from(projects).where(inArray(projects.id, ids))
      : []
  } else {
    list = await db.select().from(projects).where(eq(projects.clientId, userId))
  }

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = projectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 })

  const db = getDb()
  const [result] = await db.insert(projects).values({
    ...parsed.data,
    areaHectares: parsed.data.areaHectares?.toString(),
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    expectedEndDate: parsed.data.expectedEndDate ? new Date(parsed.data.expectedEndDate) : undefined,
    createdBy: session.user.id,
  }).$returningId()

  return NextResponse.json({ success: true, id: result.id }, { status: 201 })
}
