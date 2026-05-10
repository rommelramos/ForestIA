import { auth } from "../../../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, aoiAnalyses, geospatialSources } from "@/lib/db/schema"
import { and, asc, eq, ne } from "drizzle-orm"
import { NewReportForm } from "@/modules/reports/components/NewReportForm"

export const dynamic = "force-dynamic"

export default async function NewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  const { id } = await params
  const db = getDb()

  const [project] = await db
    .select({
      id: projects.id, name: projects.name, municipality: projects.municipality,
      state: projects.state, areaHectares: projects.areaHectares, sicarCode: projects.sicarCode,
    })
    .from(projects)
    .where(eq(projects.id, Number(id)))
    .limit(1)
  if (!project) notFound()

  const [analyses, sources] = await Promise.all([
    db.select({ id: aoiAnalyses.id, name: aoiAnalyses.name, notes: aoiAnalyses.notes, sourceType: aoiAnalyses.sourceType, geojson: aoiAnalyses.geojson })
      .from(aoiAnalyses)
      .where(and(eq(aoiAnalyses.projectId, Number(id)), ne(aoiAnalyses.sourceType, "layer"))),
    db.select({ id: geospatialSources.id, name: geospatialSources.name, organization: geospatialSources.organization, thematicCategory: geospatialSources.thematicCategory })
      .from(geospatialSources)
      .where(eq(geospatialSources.isActive, true))
      .orderBy(asc(geospatialSources.thematicCategory), asc(geospatialSources.name)),
  ])

  return (
    <div className="h-full overflow-auto p-6">
      <NewReportForm project={project} analyses={analyses} sources={sources} />
    </div>
  )
}
