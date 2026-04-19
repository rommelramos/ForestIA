import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { aoiAnalyses } from "@/lib/db/schema"
import { z } from "zod"

const createSchema = z.object({
  projectId: z.number(),
  geojson: z.string(),
  sourceType: z.enum(["upload", "manual", "sicar"]).default("manual"),
  uploadedFile: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("project")
  const db = getDb()
  const list = projectId
    ? await db.select().from(aoiAnalyses).where(eq(aoiAnalyses.projectId, Number(projectId)))
    : await db.select().from(aoiAnalyses).orderBy(aoiAnalyses.createdAt)

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const [result] = await db.insert(aoiAnalyses).values({
    ...parsed.data,
    status: "pending",
    createdBy: session.user.id,
  }).$returningId()

  return NextResponse.json({ success: true, id: result.id }, { status: 201 })
}
