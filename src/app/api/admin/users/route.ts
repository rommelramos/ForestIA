import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { users, auditLogs } from "@/lib/db/schema"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "gerente", "funcionario", "cliente"]),
  password: z.string().min(8).optional(),
  allowGoogleLogin: z.boolean().default(true),
})

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "gerente", "funcionario", "cliente"]).optional(),
  isActive: z.boolean().optional(),
  allowGoogleLogin: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const db = getDb()
  const list = await db
    .select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, isActive: users.isActive,
      allowGoogleLogin: users.allowGoogleLogin, createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const passwordHash = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 12)
    : null

  const id = uuidv4()
  await db.insert(users).values({
    id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    passwordHash: passwordHash ?? undefined,
    isActive: true,
    allowGoogleLogin: parsed.data.allowGoogleLogin,
  })
  await db.insert(auditLogs).values({
    userId: session.user.id,
    action: "user.created",
    entity: "users",
    entityId: id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  })
  return NextResponse.json({ success: true, id })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { id, ...updates } = parsed.data
  const db = getDb()
  await db.update(users).set(updates).where(eq(users.id, id))
  await db.insert(auditLogs).values({
    userId: session.user.id,
    action: "user.updated",
    entity: "users",
    entityId: id,
    metadata: updates,
  })
  return NextResponse.json({ success: true })
}
