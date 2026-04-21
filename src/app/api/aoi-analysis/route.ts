import { NextRequest, NextResponse } from "next/server"
import { eq, ne, or, isNull, and } from "drizzle-orm"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { aoiAnalyses } from "@/lib/db/schema"
import { z } from "zod"

const createSchema = z.object({
  projectId:      z.number(),
  name:           z.string().max(255).optional(),
  notes:          z.string().optional(),
  geojson:        z.string(),
  sourceType:     z.enum(["upload", "manual", "sicar", "layer"]).default("manual"),
  uploadedFile:   z.string().optional(),
  analysisResult: z.unknown().optional(),
})

/**
 * Checks whether err (or its cause) is a missing-column DB error,
 * which means migration 0002/0003 has not been applied yet.
 */
function isMissingColumn(err: unknown): boolean {
  const text = [
    err instanceof Error ? err.message : String(err),
    err instanceof Error && err.cause instanceof Error ? err.cause.message : "",
    err instanceof Error && err.cause ? String(err.cause) : "",
  ].join(" ").toLowerCase()
  return text.includes("unknown column") || text.includes("er_bad_field_error")
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("project")
  const typeParam = req.nextUrl.searchParams.get("type") // "layer" | "analysis" | undefined
  const db = getDb()

  // Build source-type filter:
  // ?type=layer   → only sourceType = 'layer'
  // default       → exclude sourceType = 'layer' (saved overlap analyses only)
  const isLayerQuery = typeParam === "layer"

  try {
    let list
    if (projectId) {
      const projectCond = eq(aoiAnalyses.projectId, Number(projectId))
      const typeCond = isLayerQuery
        ? eq(aoiAnalyses.sourceType, "layer")
        : or(isNull(aoiAnalyses.sourceType), ne(aoiAnalyses.sourceType, "layer"))
      list = await db.select().from(aoiAnalyses).where(and(projectCond, typeCond))
    } else {
      list = await db.select().from(aoiAnalyses).orderBy(aoiAnalyses.createdAt)
    }
    return NextResponse.json(list)
  } catch (err) {
    if (!isMissingColumn(err)) throw err

    // Fallback: migration not yet applied — select only original columns
    try {
      let list
      if (projectId) {
        const projectCond = eq(aoiAnalyses.projectId, Number(projectId))
        const base = db
          .select({
            id:             aoiAnalyses.id,
            projectId:      aoiAnalyses.projectId,
            geojson:        aoiAnalyses.geojson,
            sourceType:     aoiAnalyses.sourceType,
            uploadedFile:   aoiAnalyses.uploadedFile,
            status:         aoiAnalyses.status,
            analysisResult: aoiAnalyses.analysisResult,
            createdBy:      aoiAnalyses.createdBy,
            createdAt:      aoiAnalyses.createdAt,
          })
          .from(aoiAnalyses)

        // Apply source-type filter if possible
        const typeCond = isLayerQuery
          ? eq(aoiAnalyses.sourceType, "layer")
          : or(isNull(aoiAnalyses.sourceType), ne(aoiAnalyses.sourceType, "layer"))
        list = await base.where(and(projectCond, typeCond))
      } else {
        list = await db
          .select({
            id:             aoiAnalyses.id,
            projectId:      aoiAnalyses.projectId,
            geojson:        aoiAnalyses.geojson,
            sourceType:     aoiAnalyses.sourceType,
            uploadedFile:   aoiAnalyses.uploadedFile,
            status:         aoiAnalyses.status,
            analysisResult: aoiAnalyses.analysisResult,
            createdBy:      aoiAnalyses.createdBy,
            createdAt:      aoiAnalyses.createdAt,
          })
          .from(aoiAnalyses)
          .orderBy(aoiAnalyses.createdAt)
      }
      return NextResponse.json(list.map(r => ({ ...r, name: null, notes: null })))
    } catch {
      return NextResponse.json([])
    }
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
    projectId:      parsed.data.projectId,
    geojson:        parsed.data.geojson,
    sourceType:     parsed.data.sourceType,
    uploadedFile:   parsed.data.uploadedFile,
    analysisResult: parsed.data.analysisResult as Record<string, unknown> | null | undefined,
    status:         "pending" as const,
    createdBy:      session.user.id,
  }

  try {
    const [result] = await db.insert(aoiAnalyses).values({
      ...base,
      name:  parsed.data.name,
      notes: parsed.data.notes,
    }).$returningId()
    return NextResponse.json({ success: true, id: result.id }, { status: 201 })
  } catch (err) {
    if (!isMissingColumn(err)) throw err
    const [result] = await db.insert(aoiAnalyses).values(base).$returningId()
    return NextResponse.json(
      { success: true, id: result.id, warning: "Execute 'Regenerar Banco' em /setup/db para habilitar nome e notas." },
      { status: 201 },
    )
  }
}
