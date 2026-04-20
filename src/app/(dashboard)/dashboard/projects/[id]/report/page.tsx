import { auth } from "../../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { viabilityReports } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Rascunho",  cls: "bg-gray-100 text-gray-700" },
  review:    { label: "Em revisão", cls: "bg-yellow-100 text-yellow-700" },
  approved:  { label: "Aprovado",  cls: "bg-blue-100 text-blue-700" },
  published: { label: "Publicado", cls: "bg-green-100 text-green-700" },
}

export default async function ProjectReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  const db = getDb()
  const reports = await db.select().from(viabilityReports)
    .where(eq(viabilityReports.projectId, Number(id)))
    .orderBy(desc(viabilityReports.version))

  const canCreate = ["admin","gerente","funcionario"].includes(session?.user.role ?? "")

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Relatório de Viabilidade</h2>
        {canCreate && (
          <Link href={`/dashboard/projects/${id}/report/new`}
            className={cn(buttonVariants({ size: "sm" }), "bg-green-700 hover:bg-green-800")}>
            + Novo relatório
          </Link>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📄</p>
          <p className="text-sm">Nenhum relatório gerado para este projeto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, cls: "bg-gray-100 text-gray-700" }
            return (
              <div key={r.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.title}</span>
                    <span className="text-xs text-gray-400">v{r.version}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    {r.finalScore && <span>Score final: <strong>{r.finalScore}</strong></span>}
                    {r.geospatialScore && <span>Geoespacial: {r.geospatialScore}</span>}
                    {r.vegetationScore && <span>Vegetação: {r.vegetationScore}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {r.conclusion && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{r.conclusion}</p>}
                </div>
                <Link href={`/dashboard/projects/${id}/report/${r.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Ver
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
