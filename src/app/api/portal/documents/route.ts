import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projectDocuments, projectMembers, projects } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { withErrorHandling } from "@/lib/api/errors"
import { z } from "zod"

const schema = z.object({
  projectId:   z.number().int().positive(),
  name:        z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  url:         z.string().url(),
  mimeType:    z.string().max(100).optional(),
  sizeBytes:   z.number().int().positive().optional(),
  category:    z.enum(["client_upload", "engineer_upload", "report", "contract"]).default("client_upload"),
})

export const POST = withErrorHandling(async (req: Request) => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const json = await req.json()
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { projectId, name, description, url, mimeType, sizeBytes, category } = parsed.data
  const userId = session.user.id!
  const db = getDb()

  // Verificar acesso
  const [project] = await db.select({ id: projects.id, clientId: projects.clientId })
    .from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })

  const isMember = await db.select({ id: projectMembers.id }).from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1)

  const hasAccess = project.clientId === userId || isMember.length > 0
  if (!hasAccess) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  // Clientes só podem enviar client_upload
  const finalCategory = session.user.role === "cliente" ? "client_upload" : category

  await db.insert(projectDocuments).values({
    projectId,
    uploadedBy: userId,
    name,
    description: description ?? null,
    url,
    mimeType: mimeType ?? null,
    sizeBytes: sizeBytes ?? null,
    category: finalCategory,
  })

  return NextResponse.json({ success: true }, { status: 201 })
})
