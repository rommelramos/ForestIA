import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { aoiAnalyses, projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AoiUploadForm } from "@/modules/aoi-analysis/components/AoiUploadForm"
import { Map } from "lucide-react"

export const metadata = { title: "Análise Geoespacial — ForestIA" }
export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
}

export default async function AoiAnalysisPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const session = await auth()
  const { project: projectId } = await searchParams
  const canCreate = ["admin", "gerente", "funcionario"].includes(session?.user.role ?? "")

  const db = getDb()
  const analyses = projectId
    ? await db.select().from(aoiAnalyses).where(eq(aoiAnalyses.projectId, Number(projectId))).orderBy(aoiAnalyses.createdAt)
    : await db.select().from(aoiAnalyses).orderBy(aoiAnalyses.createdAt)

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Análise Geoespacial</h1>

      {canCreate && <AoiUploadForm projectId={projectId ? Number(projectId) : undefined} />}

      <Card>
        <CardHeader><CardTitle className="text-base">Análises realizadas ({analyses.length})</CardTitle></CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Map className="size-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma análise encontrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Análise #{a.id}</p>
                    <p className="text-xs text-gray-500">Projeto #{a.projectId} · {a.sourceType} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge className={STATUS_STYLES[a.status] ?? ""}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
