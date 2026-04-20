"use client"
import dynamic from "next/dynamic"

const GeospatialMap = dynamic(
  () => import("./GeospatialMap").then((m) => ({ default: m.GeospatialMap })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-gray-400 text-sm h-full">Carregando mapa...</div> }
)

export function GeospatialMapClient({ projectId, onSaved }: { projectId?: number; onSaved?: () => void }) {
  return <GeospatialMap projectId={projectId} onSaved={onSaved} />
}
