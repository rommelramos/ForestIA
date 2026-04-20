import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { aoiAnalyses } from "@/lib/db/schema"
import { z } from "zod"

const createSchema = z.object({
  projectId:    z.number(),
  name:         z.string().max(255).optional(),
  notes:        z.string().optional(),
  geojson:      z.string(),
  sourceType:   z.enum(["upload", "manual", "sicar"]).default("manual"),
  uploadedFile: z.string().optional(),
})

/** True when the DB error is a missing-column error (migration not yet applied) */
function isMissingColumn(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return msg.includes("unknown column") || msg.includes("er_bad_field_error")
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("project")
  const db = getDb()

  try {
    const list = projectId
      ? await db.select().from(aoiAnalyses).where(eq(aoiAnalyses.projectId, Number(projectId)))
      : await db.select().from(aoiAnalyses).orderBy(aoiAnalyses.createdAt)
    return NextResponse.json(list)
  } catch (err) {
    if (isMissingColumn(err)) {
      // Migration not yet applied — return empty list gracefully
      return NextResponse.json([])
    }
    throw err
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const base = {
    projectId:    parsed.data.projectId,
    geojson:      parsed.data.geojson,
    sourceType:   parsed.data.sourceType,
    uploadedFile: parsed.data.uploadedFile,
    status:       "pending" as const,
    createdBy:    session.user.id,
  }

  try {
    // Try with name + notes (requires migration 0002)
    const [result] = await db.insert(aoiAnalyses).values({
      ...base,
      name:  parsed.data.name,
      notes: parsed.data.notes,
    }).$returningId()
    return NextResponse.json({ success: true, id: result.id }, { status: 201 })
  } catch (err) {
    if (!isMissingColumn(err)) throw err
    // Fallback: migration not applied — save without name/notes
    const [result] = await db.insert(aoiAnalyses).values(base).$returningId()
    return NextResponse.json(
      { success: true, id: result.id, warning: "Aplique as migrações em /setup/db para salvar nome e notas." },
      { status: 201 },
    )
  }
}
