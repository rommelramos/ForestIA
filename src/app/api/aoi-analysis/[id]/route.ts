import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { aoiAnalyses } from "@/lib/db/schema"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const db = getDb()
  const [row] = await db.select().from(aoiAnalyses).where(eq(aoiAnalyses.id, Number(id)))
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  await db.update(aoiAnalyses).set(parsed.data).where(eq(aoiAnalyses.id, Number(id)))

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const db = getDb()
  await db.delete(aoiAnalyses).where(eq(aoiAnalyses.id, Number(id)))

  return NextResponse.json({ success: true })
}
