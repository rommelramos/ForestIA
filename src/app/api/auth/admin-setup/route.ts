import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { getDb } from "@/lib/db/drizzle"
import { users } from "@/lib/db/schema"
import { adminSetupSchema } from "@/modules/auth/schemas"
import { dbErrorResponse } from "@/lib/api/errors"

export async function POST(req: NextRequest) {
  try {
    const db = getDb()

    const existing = await db.select({ id: users.id }).from(users).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ error: "Administrador já configurado." }, { status: 409 })
    }

    const body = await req.json()
    const parsed = adminSetupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const hash = await bcrypt.hash(parsed.data.password, 12)
    await db.insert(users).values({
      id: uuidv4(),
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hash,
      role: "admin",
      isActive: true,
      allowGoogleLogin: false,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return dbErrorResponse(err)
  }
}
