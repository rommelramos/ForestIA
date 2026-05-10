import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projectMessages, projectMembers, projects } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { withErrorHandling } from "@/lib/api/errors"
import { z } from "zod"

const schema = z.object({
  projectId: z.number().int().positive(),
  body:      z.string().min(1).max(4000),
  kind:      z.enum(["question", "note"]).default("question"),
  parentId:  z.number().int().positive().optional(),
})

export const POST = withErrorHandling(async (req: Request) => {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const json = await req.json()
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { projectId, body, kind, parentId } = parsed.data
  const userId = session.user.id!
  const db = getDb()

  // Verificar acesso ao projeto
  const [project] = await db.select({ id: projects.id, clientId: projects.clientId })
    .from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })

  const isMember = await db.select({ id: projectMembers.id }).from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1)

  const isClient = project.clientId === userId
  const isTeam   = isMember.length > 0 || ["admin", "gerente", "funcionario"].includes(session.user.role ?? "")

  if (!isClient && !isTeam) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const [inserted] = await db.insert(projectMessages).values({
    projectId,
    authorId: userId,
    body,
    kind,
    parentId: parentId ?? null,
    isReadByClient: isTeam,   // se equipe enviou → já lida pelo cliente
    isReadByTeam:   isClient, // se cliente enviou → já lida pela equipe
  }).$returningId()

  const newMsg = {
    id: inserted.id,
    projectId,
    authorId: userId,
    authorName: session.user.name ?? "Usuário",
    body,
    kind,
    parentId: parentId ?? null,
    isReadByClient: isTeam,
    isReadByTeam: isClient,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(newMsg, { status: 201 })
})
