import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, projectDocuments, projectMessages, users } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { PortalTabs } from "@/components/portal/PortalTabs"
import { DocumentUploadForm } from "@/components/portal/DocumentUploadForm"
import { FileText, Download, Upload } from "lucide-react"

export const dynamic = "force-dynamic"

const CATEGORY_LABELS: Record<string, string> = {
  client_upload:    "Enviado por você",
  engineer_upload:  "Enviado pela equipe técnica",
  report:           "Relatório",
  contract:         "Contrato",
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function PortalDocumentosPage({ params }: { params: Promise<{ id: string }> }) {
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

  const docs = await db
    .select({
      id: projectDocuments.id,
      name: projectDocuments.name,
      description: projectDocuments.description,
      url: projectDocuments.url,
      mimeType: projectDocuments.mimeType,
      sizeBytes: projectDocuments.sizeBytes,
      category: projectDocuments.category,
      createdAt: projectDocuments.createdAt,
      uploaderName: users.name,
    })
    .from(projectDocuments)
    .leftJoin(users, eq(projectDocuments.uploadedBy, users.id))
    .where(eq(projectDocuments.projectId, projectId))
    .orderBy(projectDocuments.createdAt)

  const [{ unread }] = await db.select({ unread: count() }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.isReadByClient, false)))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.58 0.05 155)" }}>
        <a href="/portal" className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>Projetos</a>
        <span>/</span>
        <a href={`/portal/${projectId}`} className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>{project.name}</a>
        <span>/</span>
        <span style={{ color: "oklch(0.25 0.05 155)" }}>Documentos</span>
      </div>

      <PortalTabs projectId={projectId} unreadMessages={unread} />

      {/* Upload form */}
      <div className="rounded-2xl p-5"
           style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Upload className="size-4" style={{ color: "oklch(0.48 0.10 155)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "oklch(0.48 0.06 155)" }}>
            Enviar documento
          </h2>
        </div>
        <DocumentUploadForm projectId={projectId} />
      </div>

      {/* Document list */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
        <div className="px-5 py-4 border-b flex items-center gap-2"
             style={{ borderColor: "oklch(0.90 0.015 155 / 60%)" }}>
          <FileText className="size-4" style={{ color: "oklch(0.48 0.10 155)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "oklch(0.48 0.06 155)" }}>
            Documentos do projeto
          </h2>
          <span className="text-xs ml-auto px-2 py-0.5 rounded-full"
                style={{ background: "oklch(0.45 0.13 155 / 10%)", color: "oklch(0.42 0.10 155)" }}>
            {docs.length}
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "oklch(0.56 0.04 155)" }}>
              Nenhum documento anexado ainda.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(0.92 0.010 155 / 50%)" }}>
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: "oklch(0.97 0.005 155)", border: "1px solid oklch(0.88 0.015 155)" }}>
                  <FileText className="size-4" style={{ color: "oklch(0.55 0.08 155)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "oklch(0.20 0.04 155)" }}>
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.58 0.04 155)" }}>
                    <span>{CATEGORY_LABELS[doc.category ?? ""] ?? doc.category}</span>
                    {doc.sizeBytes && <span>· {formatBytes(doc.sizeBytes)}</span>}
                    <span>· {new Date(doc.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center size-8 rounded-lg transition-colors"
                   style={{ color: "oklch(0.48 0.10 155)", border: "1px solid oklch(0.85 0.02 155)" }}>
                  <Download className="size-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
