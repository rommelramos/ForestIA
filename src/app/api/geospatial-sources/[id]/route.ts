import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { geospatialSources } from "@/lib/db/schema"
import { geospatialSourceSchema } from "@/modules/geospatial-sources/schemas"
import { withErrorHandling } from "@/lib/api/errors"

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = geospatialSourceSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  await db.update(geospatialSources).set(parsed.data).where(eq(geospatialSources.id, Number(id)))
  return NextResponse.json({ success: true })
})

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const db = getDb()
  await db.update(geospatialSources).set({ isActive: false }).where(eq(geospatialSources.id, Number(id)))
  return NextResponse.json({ success: true })
})
