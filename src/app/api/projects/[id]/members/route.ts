import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { auth } from "../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projectMembers } from "@/lib/db/schema"
import { memberSchema } from "@/modules/projects/schemas"
import { withErrorHandling } from "@/lib/api/errors"

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = memberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  await db.insert(projectMembers).values({ projectId: Number(id), ...parsed.data })
  return NextResponse.json({ success: true }, { status: 201 })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const { userId } = await req.json()
  const db = getDb()
  await db.delete(projectMembers).where(
    and(eq(projectMembers.projectId, Number(id)), eq(projectMembers.userId, userId))
  )
  return NextResponse.json({ success: true })
})
