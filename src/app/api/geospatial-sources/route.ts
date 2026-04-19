import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { geospatialSources } from "@/lib/db/schema"
import { geospatialSourceSchema, PUBLIC_SOURCES } from "@/modules/geospatial-sources/schemas"
import { eq } from "drizzle-orm"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const db = getDb()
  const list = await db.select().from(geospatialSources).where(eq(geospatialSources.isActive, true)).orderBy(geospatialSources.name)
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()

  if (body.seedPublicSources) {
    const db = getDb()
    await db.insert(geospatialSources).values(
      PUBLIC_SOURCES.map((s) => ({
        ...s,
        reliabilityLevel: s.reliabilityLevel,
        createdBy: session.user.id,
      }))
    )
    return NextResponse.json({ success: true, inserted: PUBLIC_SOURCES.length })
  }

  const parsed = geospatialSourceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const [result] = await db.insert(geospatialSources).values({
    ...parsed.data,
    createdBy: session.user.id,
  }).$returningId()

  return NextResponse.json({ success: true, id: result.id }, { status: 201 })
}
