import { auth } from "../../../../../../../auth"
import { GeospatialMapClient } from "@/modules/aoi-analysis/components/GeospatialMapClient"
import { OverlapsList } from "@/modules/aoi-analysis/components/OverlapsList"

export const dynamic = "force-dynamic"

export default async function ProjectGeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canManage = ["admin", "gerente", "funcionario"].includes(session?.user.role ?? "")

  return (
    <div className="flex flex-col h-full">
      {/* Map — fixed height */}
      <div style={{ height: "65vh" }} className="flex-shrink-0 border-b">
        <GeospatialMapClient projectId={Number(id)} />
      </div>

      {/* Saved overlaps list */}
      <div className="flex-1 overflow-auto p-6 space-y-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sobreposições salvas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Análises de sobreposição calculadas e salvas para este projeto.
            </p>
          </div>
        </div>
        <OverlapsList projectId={Number(id)} canManage={canManage} />
      </div>
    </div>
  )
}
