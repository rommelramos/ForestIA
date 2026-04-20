import { GeospatialMapClient } from "@/modules/aoi-analysis/components/GeospatialMapClient"

export const dynamic = "force-dynamic"

export default async function ProjectGeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="h-full">
      <GeospatialMapClient projectId={Number(id)} />
    </div>
  )
}
