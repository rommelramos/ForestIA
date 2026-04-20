import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { inviteTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

const schema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["funcionario","gerente","cliente"]).default("funcionario"),
  expiresInDays: z.number().min(1).max(30).default(7),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin","gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays)

  const db = getDb()
  await db.insert(inviteTokens).values({
    token,
    email: parsed.data.email,
    role: parsed.data.role,
    expiresAt,
    createdBy: session.user.id,
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const inviteUrl = `${baseUrl}/register/${token}`

  return NextResponse.json({ success: true, token, inviteUrl, expiresAt })
}

export async function GET() {
  const session = await auth()
  if (!session || !["admin","gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const db = getDb()
  const list = await db.select().from(inviteTokens).orderBy(inviteTokens.createdAt)
  return NextResponse.json(list)
}
