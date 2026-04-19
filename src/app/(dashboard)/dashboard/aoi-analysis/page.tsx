import { auth } from "../../../../../auth"
import { GeospatialMapClient } from "@/modules/aoi-analysis/components/GeospatialMapClient"

export const metadata = { title: "Análise Geoespacial — ForestIA" }
export const dynamic = "force-dynamic"

export default async function AoiAnalysisPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  await auth()
  const { project: projectId } = await searchParams

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Análise Geoespacial</h1>
          <p className="text-xs text-gray-500">Carregue shapefiles, desenhe polígonos e analise sobreposições</p>
        </div>
        <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-400">
          Suporta: .geojson · .json · .zip (shapefile)
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <GeospatialMapClient projectId={projectId ? Number(projectId) : undefined} />
      </div>
    </div>
  )
}
