import { auth } from "../../../../../../../auth"
import { GeoSplitLayout } from "@/modules/aoi-analysis/components/GeoSplitLayout"

export const dynamic = "force-dynamic"

export default async function ProjectGeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canManage = ["admin", "gerente", "funcionario"].includes(session?.user.role ?? "")

  return (
    <div className="h-full">
      <GeoSplitLayout projectId={Number(id)} canManage={canManage} />
    </div>
  )
}
