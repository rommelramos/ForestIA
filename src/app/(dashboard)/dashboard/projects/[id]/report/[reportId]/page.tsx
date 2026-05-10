import { auth } from "../../../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { viabilityReports } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
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

  const [report] = await db
    .select()
    .from(viabilityReports)
    .where(eq(viabilityReports.id, Number(reportId)))
    .limit(1)
  if (!report) notFound()

  const canEdit = ["admin", "gerente", "funcionario"].includes(session.user.role)
  if (!canEdit) redirect("/dashboard")

  return (
    <div className="h-full overflow-auto p-6">
      <ReportEditor
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
