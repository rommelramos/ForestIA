import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { users } from "@/lib/db/schema"
import { z } from "zod"
import { withErrorHandling } from "@/lib/api/errors"

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

export const GET = withErrorHandling(async () => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const db = getDb()
  const [user] = await db
    .select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, allowGoogleLogin: users.allowGoogleLogin,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
  return NextResponse.json(user)
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { name, currentPassword, newPassword } = parsed.data
  const db = getDb()
  const updates: Record<string, unknown> = {}

  if (name) updates.name = name

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual obrigatória" }, { status: 400 })
    }
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Conta sem senha — use o login com Google" }, { status: 400 })
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
    updates.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhuma alteração informada" }, { status: 400 })
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id))
  return NextResponse.json({ success: true })
})
