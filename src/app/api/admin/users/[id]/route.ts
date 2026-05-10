import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { users, auditLogs } from "@/lib/db/schema"
import { z } from "zod"
import { withErrorHandling } from "@/lib/api/errors"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "gerente", "funcionario", "cliente"]).optional(),
  isActive: z.boolean().optional(),
  allowGoogleLogin: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const db = getDb()
  const [user] = await db
    .select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, isActive: users.isActive,
      allowGoogleLogin: users.allowGoogleLogin, createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(user)
})

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { password, ...rest } = parsed.data
  const updates: Record<string, unknown> = { ...rest }
  if (password) updates.passwordHash = await bcrypt.hash(password, 12)

  const db = getDb()
  await db.update(users).set(updates).where(eq(users.id, id))
  await db.insert(auditLogs).values({
    userId: session.user.id,
    action: "user.updated",
    entity: "users",
    entityId: id,
    metadata: { ...rest, passwordChanged: !!password },
  })
  return NextResponse.json({ success: true })
})
