import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { satelliteAnalyses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Satellite } from "lucide-react"

export const metadata = { title: "Análise por Satélite — ForestIA" }
export const dynamic = "force-dynamic"

const VEGETATION_CLASSES: Record<string, { label: string; color: string }> = {
  densa:    { label: "Densa",    color: "bg-green-700 text-white" },
  moderada: { label: "Moderada", color: "bg-green-400 text-white" },
  escassa:  { label: "Escassa",  color: "bg-yellow-400 text-white" },
  ausente:  { label: "Ausente",  color: "bg-red-400 text-white" },
}

export default async function SatellitePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project: projectId } = await searchParams
  const db = getDb()
  const analyses = projectId
    ? await db.select().from(satelliteAnalyses).where(eq(satelliteAnalyses.projectId, Number(projectId))).orderBy(satelliteAnalyses.imageDate)
    : await db.select().from(satelliteAnalyses).orderBy(satelliteAnalyses.imageDate)

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Análise por Satélite e Índices de Vegetação</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["NDVI", "EVI", "SAVI", "NDWI"].map((idx) => (
          <Card key={idx} className="text-center">
            <CardContent className="pt-4 pb-3">
              <p className="text-lg font-bold text-green-700">—</p>
              <p className="text-xs text-gray-500 mt-1">{idx}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Análises registradas</CardTitle></CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Satellite className="size-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma análise por satélite registrada.</p>
              <p className="text-xs mt-1">As análises são geradas automaticamente durante o processamento do projeto.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-left py-2 font-medium">Data da imagem</th>
                  <th className="text-left py-2 font-medium">Provedor</th>
                  <th className="text-left py-2 font-medium">NDVI</th>
                  <th className="text-left py-2 font-medium">EVI</th>
                  <th className="text-left py-2 font-medium">NDWI</th>
                  <th className="text-left py-2 font-medium">Nuvens</th>
                  <th className="text-left py-2 font-medium">Classificação</th>
                </tr></thead>
                <tbody>
                  {analyses.map((a) => {
                    const cls = VEGETATION_CLASSES[a.vegetationClass ?? ""] ?? { label: a.vegetationClass ?? "—", color: "bg-gray-100 text-gray-700" }
                    return (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="py-2">{a.imageDate ? new Date(a.imageDate).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="py-2 text-gray-600">{a.provider ?? "—"}</td>
                        <td className="py-2 font-mono">{a.ndvi ? Number(a.ndvi).toFixed(3) : "—"}</td>
                        <td className="py-2 font-mono">{a.evi ? Number(a.evi).toFixed(3) : "—"}</td>
                        <td className="py-2 font-mono">{a.ndwi ? Number(a.ndwi).toFixed(3) : "—"}</td>
                        <td className="py-2">{a.cloudCoverPercent ? `${Number(a.cloudCoverPercent).toFixed(0)}%` : "—"}</td>
                        <td className="py-2"><Badge className={cls.color + " text-xs"}>{cls.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
