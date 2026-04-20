import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/drizzle"
import { inviteTokens, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

const schema = z.object({
  token: z.string(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { token, name, email, password } = parsed.data
  const db = getDb()

  const [invite] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token)).limit(1)
  if (!invite) return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  if (invite.usedAt) return NextResponse.json({ error: "Token já utilizado" }, { status: 400 })
  if (new Date() > new Date(invite.expiresAt)) return NextResponse.json({ error: "Token expirado" }, { status: 400 })

  const finalEmail = email ?? invite.email
  if (!finalEmail) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 })

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, finalEmail)).limit(1)
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })

  const hash = await bcrypt.hash(password, 12)
  await db.insert(users).values({
    id: uuidv4(),
    name,
    email: finalEmail,
    passwordHash: hash,
    role: invite.role,
    isActive: false, // requires admin approval
    allowGoogleLogin: false,
  })

  // Mark token as used
  await db.update(inviteTokens).set({ usedAt: new Date() }).where(eq(inviteTokens.token, token))

  return NextResponse.json({ success: true })
}
