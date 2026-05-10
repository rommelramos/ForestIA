import { auth } from "../../../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { viabilityReports, geospatialSources } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { ReportEditor } from "@/modules/reports/components/ReportEditor"

export const dynamic = "force-dynamic"

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { reportId } = await params
  const db = getDb()

  const [[report], sources] = await Promise.all([
    db.select().from(viabilityReports).where(eq(viabilityReports.id, Number(reportId))).limit(1),
    db.select({ id: geospatialSources.id, name: geospatialSources.name, organization: geospatialSources.organization, thematicCategory: geospatialSources.thematicCategory })
      .from(geospatialSources)
      .where(eq(geospatialSources.isActive, true))
      .orderBy(asc(geospatialSources.thematicCategory), asc(geospatialSources.name)),
  ])

  if (!report) notFound()

  if (!["admin", "gerente", "funcionario"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="h-full overflow-auto p-6">
      <ReportEditor
        sources={sources}
        report={{
          ...report,
          geospatialScore: report.geospatialScore ? String(report.geospatialScore) : null,
          vegetationScore: report.vegetationScore ? String(report.vegetationScore) : null,
          consultantScore: report.consultantScore ? String(report.consultantScore) : null,
          finalScore: report.finalScore ? String(report.finalScore) : null,
          content: report.content as Record<string, unknown> | null,
          publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
          createdAt: report.createdAt.toISOString(),
          updatedAt: report.updatedAt.toISOString(),
        }}
      />
    </div>
  )
}
