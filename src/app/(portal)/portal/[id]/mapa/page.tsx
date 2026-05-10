import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, aoiAnalyses, projectMessages } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { PortalTabs } from "@/components/portal/PortalTabs"
import { PortalMapView } from "@/components/portal/PortalMapView"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PortalMapaPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Buscar AOIs com GeoJSON
  const aois = await db
    .select({ id: aoiAnalyses.id, name: aoiAnalyses.name, geojson: aoiAnalyses.geojson, status: aoiAnalyses.status })
    .from(aoiAnalyses)
    .where(eq(aoiAnalyses.projectId, projectId))

  const [{ unread }] = await db.select({ unread: count() }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.isReadByClient, false)))

  const geojsonLayers = aois
    .filter(a => a.geojson)
    .map(a => ({ id: a.id, name: a.name ?? `Área ${a.id}`, geojson: a.geojson! }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.58 0.05 155)" }}>
        <Link href="/portal" className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>Projetos</Link>
        <span>/</span>
        <Link href={`/portal/${projectId}`} className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>{project.name}</Link>
        <span>/</span>
        <span style={{ color: "oklch(0.25 0.05 155)" }}>Mapa</span>
      </div>

      <PortalTabs projectId={projectId} unreadMessages={unread} />

      <div className="rounded-2xl overflow-hidden" style={{ height: "520px", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
        <PortalMapView layers={geojsonLayers} />
      </div>

      {geojsonLayers.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: "oklch(0.56 0.04 155)" }}>
          Nenhuma área de interesse cadastrada ainda.
        </p>
      )}
    </div>
  )
}
