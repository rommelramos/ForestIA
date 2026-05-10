import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, projectMessages, users } from "@/lib/db/schema"
import { eq, and, count, asc } from "drizzle-orm"
import { PortalTabs } from "@/components/portal/PortalTabs"
import { MessageThreadView } from "@/components/portal/MessageThreadView"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PortalMensagensPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params
  const projectId = parseInt(id, 10)
  if (isNaN(projectId)) notFound()

  const userId = session.user.id!
  const db = getDb()

  const [project] = await db.select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) notFound()

  const isMember = await db.select({ id: projectMembers.id }).from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1)
  if (project.clientId !== userId && isMember.length === 0) redirect("/portal")

  // Buscar mensagens com autor
  const messages = await db
    .select({
      id: projectMessages.id,
      body: projectMessages.body,
      kind: projectMessages.kind,
      parentId: projectMessages.parentId,
      createdAt: projectMessages.createdAt,
      authorId: projectMessages.authorId,
      authorName: users.name,
      isReadByClient: projectMessages.isReadByClient,
    })
    .from(projectMessages)
    .leftJoin(users, eq(projectMessages.authorId, users.id))
    .where(eq(projectMessages.projectId, projectId))
    .orderBy(asc(projectMessages.createdAt))

  const [{ unread }] = await db.select({ unread: count() }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.isReadByClient, false)))

  // Marcar como lidas (mensagens não lidas pelo cliente)
  if (unread > 0) {
    await db
      .update(projectMessages)
      .set({ isReadByClient: true })
      .where(and(
        eq(projectMessages.projectId, projectId),
        eq(projectMessages.isReadByClient, false),
      ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.58 0.05 155)" }}>
        <Link href="/portal" className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>Projetos</Link>
        <span>/</span>
        <Link href={`/portal/${projectId}`} className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>{project.name}</Link>
        <span>/</span>
        <span style={{ color: "oklch(0.25 0.05 155)" }}>Mensagens</span>
      </div>

      <PortalTabs projectId={projectId} unreadMessages={0} />

      <MessageThreadView
        projectId={projectId}
        currentUserId={userId}
        messages={messages.map(m => ({
          ...m,
          authorName: m.authorName ?? "Usuário",
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
