import { getDb } from "@/lib/db/drizzle"
import { satelliteAnalyses } from "@/lib/db/schema"
import { avg, eq } from "drizzle-orm"
import { cn } from "@/lib/utils"
import { Satellite } from "lucide-react"

export const metadata = { title: "Análise por Satélite — ForestIA" }
export const dynamic   = "force-dynamic"

const VEGETATION_CLASSES: Record<string, { label: string; bg: string; dot: string }> = {
  densa:    { label: "Densa",    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",  dot: "bg-emerald-600" },
  moderada: { label: "Moderada", bg: "bg-lime-50    text-lime-800    border-lime-200",     dot: "bg-lime-500" },
  escassa:  { label: "Escassa",  bg: "bg-amber-50   text-amber-800   border-amber-200",    dot: "bg-amber-400" },
  ausente:  { label: "Ausente",  bg: "bg-red-50     text-red-700     border-red-200",      dot: "bg-red-500" },
}

const INDEX_CARDS = [
  { key: "ndvi",  label: "NDVI",  desc: "Vegetação",  color: "text-emerald-600" },
  { key: "evi",   label: "EVI",   desc: "Vegetação aprimorada", color: "text-lime-600" },
  { key: "savi",  label: "SAVI",  desc: "Solo ajustado",        color: "text-amber-600" },
  { key: "ndwi",  label: "NDWI",  desc: "Água",                 color: "text-blue-600" },
]

export default async function SatellitePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: projectId } = await searchParams
  const db = getDb()

  const query = projectId
    ? db.select().from(satelliteAnalyses).where(eq(satelliteAnalyses.projectId, Number(projectId))).orderBy(satelliteAnalyses.imageDate)
    : db.select().from(satelliteAnalyses).orderBy(satelliteAnalyses.imageDate)

  // Compute averages in the same round-trip if possible
  const [analyses, avgRow] = await Promise.all([
    query,
    db.select({
      ndvi: avg(satelliteAnalyses.ndvi),
      evi:  avg(satelliteAnalyses.evi),
      ndwi: avg(satelliteAnalyses.ndwi),
    }).from(satelliteAnalyses),
  ])

  const avgs = avgRow[0] ?? {}

  const fmt = (v: unknown) =>
    v != null && !isNaN(Number(v)) ? Number(v).toFixed(3) : "—"

  const avgValues: Record<string, string> = {
    ndvi: fmt(avgs.ndvi),
    evi:  fmt(avgs.evi),
    savi: "—",          // not averaged directly — derived index
    ndwi: fmt(avgs.ndwi),
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">
          Sensoriamento Remoto
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
          Análise por Satélite
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Índices espectrais de vegetação e cobertura hídrica
        </p>
      </div>

      {/* ── Index summary cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {INDEX_CARDS.map(idx => (
          <div key={idx.key} className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-sm text-center space-y-1">
            <p className={cn("text-2xl font-bold tabular-nums", idx.color)}>
              {avgValues[idx.key]}
            </p>
            <p className="text-sm font-semibold text-zinc-800">{idx.label}</p>
            <p className="text-[11px] text-zinc-400">{idx.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800">Análises registradas</h2>
          <span className="text-xs text-zinc-400">{analyses.length} registro{analyses.length !== 1 ? "s" : ""}</span>
        </div>

        {analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="size-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Satellite className="size-8 text-zinc-400" />
            </div>
            <p className="font-semibold text-zinc-700 text-sm">Nenhuma análise registrada</p>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs">
              As análises são geradas automaticamente durante o processamento geoespacial de cada projeto.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50/60 border-b border-zinc-100">
                  {["Data da imagem","Provedor","NDVI","EVI","NDWI","Nuvens","Classificação"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {analyses.map(a => {
                  const cls = VEGETATION_CLASSES[a.vegetationClass ?? ""]
                  return (
                    <tr key={a.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-700">
                        {a.imageDate ? new Date(a.imageDate).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{a.provider ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-zinc-700">{a.ndvi ? Number(a.ndvi).toFixed(3) : "—"}</td>
                      <td className="px-4 py-3 font-mono text-zinc-700">{a.evi  ? Number(a.evi).toFixed(3)  : "—"}</td>
                      <td className="px-4 py-3 font-mono text-zinc-700">{a.ndwi ? Number(a.ndwi).toFixed(3) : "—"}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {a.cloudCoverPercent ? `${Number(a.cloudCoverPercent).toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {cls ? (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            cls.bg,
                          )}>
                            <span className={cn("size-1.5 rounded-full shrink-0", cls.dot)} />
                            {cls.label}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
