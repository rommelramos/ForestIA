import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { geospatialSources } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SeedSourcesButton } from "@/modules/geospatial-sources/components/SeedSourcesButton"
import { Star, ExternalLink, Map, Plus } from "lucide-react"

export const metadata = { title: "Bases Geoespaciais — ForestIA" }
export const dynamic   = "force-dynamic"

const TYPE_STYLES: Record<string, string> = {
  vetorial: "bg-blue-50   text-blue-700   border-blue-200",
  raster:   "bg-violet-50 text-violet-700 border-violet-200",
  tabular:  "bg-zinc-100  text-zinc-600   border-zinc-200",
  api:      "bg-emerald-50 text-emerald-700 border-emerald-200",
}

const CATEGORY_LABELS: Record<string, string> = {
  vegetacao:                "Vegetação",
  uso_solo:                 "Uso do Solo",
  hidrografia:              "Hidrografia",
  areas_protegidas:         "Áreas Protegidas",
  fundiario:                "Fundiário",
  infraestrutura:           "Infraestrutura",
  limites_administrativos:  "Limites Adm.",
}

export default async function GeospatialSourcesPage() {
  const session   = await auth()
  const canManage = ["admin","gerente"].includes(session?.user.role ?? "")
  const db        = getDb()
  const list      = await db
    .select()
    .from(geospatialSources)
    .where(eq(geospatialSources.isActive, true))
    .orderBy(geospatialSources.name)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">
            Ferramentas
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">Bases Geoespaciais</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {list.length} fonte{list.length !== 1 ? "s" : ""} cadastrada{list.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap self-start">
            {list.length === 0 && <SeedSourcesButton />}
            <Link
              href="/dashboard/geospatial-sources/new"
              className={cn(buttonVariants(), "bg-emerald-600 hover:bg-emerald-700 shadow-sm gap-1.5")}
            >
              <Plus className="size-4" />
              Nova fonte
            </Link>
          </div>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center px-4">
          <div className="size-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Map className="size-8 text-zinc-400" />
          </div>
          <p className="font-semibold text-zinc-700 text-sm">Nenhuma base cadastrada</p>
          <p className="text-xs text-zinc-400 mt-1.5 mb-5 max-w-xs">
            Adicione fontes de dados geoespaciais ou importe o catálogo padrão.
          </p>
          {canManage && <SeedSourcesButton variant="prominent" />}
        </div>
      ) : (
        /* ── Source grid ──────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map(src => (
            <div
              key={src.id}
              className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3"
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 leading-snug truncate">{src.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{src.organization}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0",
                  TYPE_STYLES[src.dataType] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
                )}>
                  {src.dataType}
                </span>
              </div>

              {/* Category + description */}
              <div className="space-y-1.5">
                {src.thematicCategory && (
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
                    {CATEGORY_LABELS[src.thematicCategory] ?? src.thematicCategory}
                  </span>
                )}
                {src.description && (
                  <p className="text-xs text-zinc-600 line-clamp-2">{src.description}</p>
                )}
                {src.applicability && (
                  <p className="text-xs text-emerald-700 line-clamp-2">
                    <span className="font-semibold">Uso:</span> {src.applicability}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                {/* Star rating */}
                <div className="flex gap-0.5" title={`Confiabilidade: ${src.reliabilityLevel ?? 0}/5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3.5",
                        i < (src.reliabilityLevel ?? 0)
                          ? "text-amber-400 fill-amber-400"
                          : "text-zinc-200 fill-zinc-200",
                      )}
                    />
                  ))}
                </div>
                {src.accessUrl && (
                  <a
                    href={src.accessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    Acessar <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
