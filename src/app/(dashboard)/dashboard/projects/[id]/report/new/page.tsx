import { auth } from "../../../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, aoiAnalyses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
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
    .select({ id: projects.id, name: projects.name, municipality: projects.municipality, state: projects.state, areaHectares: projects.areaHectares })
    .from(projects)
    .where(eq(projects.id, Number(id)))
    .limit(1)
  if (!project) notFound()

  const analyses = await db
    .select({ id: aoiAnalyses.id, name: aoiAnalyses.name, notes: aoiAnalyses.notes, sourceType: aoiAnalyses.sourceType, geojson: aoiAnalyses.geojson })
    .from(aoiAnalyses)
    .where(eq(aoiAnalyses.projectId, Number(id)))

  return (
    <div className="h-full overflow-auto p-6">
      <NewReportForm project={project} analyses={analyses} />
    </div>
  )
}
