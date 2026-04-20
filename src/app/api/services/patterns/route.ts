import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { servicePatterns } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const schema = z.object({
  trigger: z.string().min(10),
  suggestedService: z.string().min(3),
  rationale: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  const db = getDb()
  return NextResponse.json(await db.select().from(servicePatterns))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  const db = getDb()
  const [r] = await db.insert(servicePatterns).values({ ...parsed.data, createdBy: session.user.id }).$returningId()
  return NextResponse.json({ success: true, id: r.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  const { id } = await req.json()
  const db = getDb()
  await db.delete(servicePatterns).where(eq(servicePatterns.id, Number(id)))
  return NextResponse.json({ success: true })
}
