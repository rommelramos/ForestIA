import { auth } from "../../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { satelliteAnalyses } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

const VEG_CLASS: Record<string, { label: string; cls: string }> = {
  densa:    { label: "Densa",    cls: "text-green-700 bg-green-100" },
  moderada: { label: "Moderada", cls: "text-green-500 bg-green-50" },
  escassa:  { label: "Escassa",  cls: "text-yellow-700 bg-yellow-100" },
  ausente:  { label: "Ausente",  cls: "text-red-700 bg-red-100" },
}

export default async function ProjectSatellitePage({ params }: { params: Promise<{ id: string }> }) {
  await auth()
  const { id } = await params
  const db = getDb()
  const analyses = await db.select().from(satelliteAnalyses)
    .where(eq(satelliteAnalyses.projectId, Number(id)))
    .orderBy(desc(satelliteAnalyses.imageDate))

  const avg = (key: keyof typeof analyses[0]) =>
    analyses.length ? (analyses.reduce((s, a) => s + Number(a[key] ?? 0), 0) / analyses.length).toFixed(3) : "—"

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Análise por Satélite</h2>
        <span className="text-xs text-gray-400">{analyses.length} imagem(ns)</span>
      </div>

      {/* Index averages */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "NDVI médio", value: avg("ndvi"), color: "green" },
          { label: "EVI médio",  value: avg("evi"),  color: "emerald" },
          { label: "SAVI médio", value: avg("savi"), color: "teal" },
          { label: "NDWI médio", value: avg("ndwi"), color: "blue" },
        ].map((m) => (
          <div key={m.label} className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🛰️</p>
          <p className="text-sm">Nenhuma análise de satélite registrada para este projeto.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Data", "Provedor", "NDVI", "EVI", "NDWI", "Nuvens %", "Classe Vegetação"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {analyses.map((a) => {
                const vc = VEG_CLASS[a.vegetationClass ?? ""] ?? { label: a.vegetationClass ?? "—", cls: "text-gray-600" }
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{a.imageDate ? new Date(a.imageDate).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">{a.provider ?? "—"}</td>
                    <td className="px-4 py-3 font-mono">{Number(a.ndvi ?? 0).toFixed(3)}</td>
                    <td className="px-4 py-3 font-mono">{Number(a.evi ?? 0).toFixed(3)}</td>
                    <td className="px-4 py-3 font-mono">{Number(a.ndwi ?? 0).toFixed(3)}</td>
                    <td className="px-4 py-3 font-mono">{Number(a.cloudCoverPercent ?? 0).toFixed(0)}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vc.cls}`}>{vc.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
