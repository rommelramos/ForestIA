"use client"

import { useEffect, useState } from "react"
import {
  X, BarChart2, FlaskConical, Layers2, Droplets,
  Flame, TreePine, Activity, ExternalLink, AlertCircle,
  CheckCircle2, WifiOff, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapLayer {
  id:          string
  dbId?:       number
  name:        string
  color:       string
  geojson:     GeoJSON.FeatureCollection
  visible:     boolean
  source:      "drawn" | "upload" | "sample"
  totalAreaHa: number
  layerType:   "aoi" | "restriction" | null
  syncStatus?: "saving" | "saved" | "error" | "local"
  syncError?:  string
  syncWarning?: string
  blobUrl?:    string
}

interface IndexResult {
  mean: number
  min:  number
  max:  number
  unit: string
}

type DataSource = "mock" | "gee" | "gee-error"

interface AnalysisData {
  indices:   Record<string, IndexResult>
  landuse:   Record<string, number>
  source:    DataSource
  note?:     string
  fetchedAt?: string   // ISO timestamp added client-side
}

// ── Spectral index definitions ────────────────────────────────────────────────

const SPECTRAL_INDICES = [
  {
    id:       "ndvi",
    label:    "NDVI",
    fullName: "Normalized Difference Vegetation Index",
    formula:  "(NIR − RED) / (NIR + RED)",
    range:    "−1 a +1",
    color:    "#22c55e",
    gradFrom: "#166534",
    gradTo:   "#86efac",
    icon:     TreePine,
    desc:     "Mede o vigor e densidade da vegetação. Valores altos (> 0.5) indicam vegetação densa e saudável.",
  },
  {
    id:       "evi",
    label:    "EVI",
    fullName: "Enhanced Vegetation Index",
    formula:  "2.5 × (NIR − RED) / (NIR + 6×RED − 7.5×BLUE + 1)",
    range:    "0 a +1",
    color:    "#16a34a",
    gradFrom: "#14532d",
    gradTo:   "#4ade80",
    icon:     Activity,
    desc:     "Versão aprimorada do NDVI, menos sensível a atmosfera e solo exposto.",
  },
  {
    id:       "savi",
    label:    "SAVI",
    fullName: "Soil-Adjusted Vegetation Index",
    formula:  "((NIR − RED) / (NIR + RED + 0.5)) × 1.5",
    range:    "−1 a +1",
    color:    "#84cc16",
    gradFrom: "#365314",
    gradTo:   "#bef264",
    icon:     Layers2,
    desc:     "Índice de vegetação ajustado para minimizar influência do solo em áreas de cobertura esparsa.",
  },
  {
    id:       "ndwi",
    label:    "NDWI",
    fullName: "Normalized Difference Water Index",
    formula:  "(GREEN − NIR) / (GREEN + NIR)",
    range:    "−1 a +1",
    color:    "#0ea5e9",
    gradFrom: "#0c4a6e",
    gradTo:   "#7dd3fc",
    icon:     Droplets,
    desc:     "Detecta corpos d'água e umidade foliar. Valores positivos indicam presença de água.",
  },
  {
    id:       "nbr",
    label:    "NBR",
    fullName: "Normalized Burn Ratio",
    formula:  "(NIR − SWIR) / (NIR + SWIR)",
    range:    "−1 a +1",
    color:    "#f97316",
    gradFrom: "#7c2d12",
    gradTo:   "#fed7aa",
    icon:     Flame,
    desc:     "Índice para detecção de áreas queimadas. Valores negativos indicam área recentemente queimada.",
  },
  {
    id:       "ndmi",
    label:    "NDMI",
    fullName: "Normalized Difference Moisture Index",
    formula:  "(NIR − SWIR1) / (NIR + SWIR1)",
    range:    "−1 a +1",
    color:    "#a855f7",
    gradFrom: "#4c1d95",
    gradTo:   "#d8b4fe",
    icon:     FlaskConical,
    desc:     "Avalia umidade da vegetação. Valores altos indicam alta concentração de água nas folhas.",
  },
] as const

// ── IBGE vegetation types ─────────────────────────────────────────────────────

const VEGETATION_TYPES = [
  { label: "Floresta Ombrófila Densa",    color: "#155e1a", pct: 32 },
  { label: "Floresta Ombrófila Aberta",   color: "#1e7723", pct: 18 },
  { label: "Floresta Estacional",          color: "#2d9e34", pct: 12 },
  { label: "Cerrado (Savana)",             color: "#9e8a2d", pct: 15 },
  { label: "Campinarana",                  color: "#c4a827", pct: 8  },
  { label: "Formações Pioneiras",          color: "#6ca832", pct: 7  },
  { label: "Contato / Tensão Ecológica",   color: "#7e9b3c", pct: 5  },
  { label: "Área Antrópica",               color: "#b55c2e", pct: 3  },
] as const

// ── Land-use colors per Forest Code ──────────────────────────────────────────

const LANDUSE_COLORS: Record<string, string> = {
  "Vegetação Nativa":                        "#166534",
  "Área de Preservação Permanente (APP)":    "#0369a1",
  "Reserva Legal":                           "#15803d",
  "Área Consolidada":                        "#ca8a04",
  "Uso Alternativo do Solo":                 "#92400e",
  "Recursos Hídricos":                       "#0284c7",
  "Servidão Ambiental":                      "#7c3aed",
}

// ── Theme helper (minimal — mirrors GeospatialMap) ────────────────────────────

function th(dk: boolean) {
  return {
    panel:    dk ? "bg-zinc-900 text-zinc-200 border-zinc-700/50" : "bg-white text-zinc-800 border-zinc-200",
    header:   dk ? "bg-zinc-800 border-zinc-700/50 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-600",
    section:  dk ? "border-zinc-700/50" : "border-zinc-200",
    label:    dk ? "text-zinc-500" : "text-zinc-400",
    muted:    dk ? "text-zinc-500" : "text-zinc-400",
    text:     dk ? "text-zinc-200" : "text-zinc-800",
    card:     dk ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-200",
    table:    dk ? "bg-zinc-800/60 border-zinc-700" : "bg-white border-zinc-200",
    tableRow: dk ? "border-zinc-700 hover:bg-zinc-700/40" : "border-zinc-100 hover:bg-zinc-50",
    tableTh:  dk ? "bg-zinc-800 text-zinc-400" : "bg-zinc-50 text-zinc-500",
    badge:    dk ? "bg-zinc-700 text-zinc-300" : "bg-zinc-100 text-zinc-600",
    input:    dk ? "bg-zinc-700 border-zinc-600 text-zinc-200" : "border-zinc-300 text-zinc-800",
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBoundingBox(fc: GeoJSON.FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  let found = false

  function visitCoord(c: number[]) {
    if (c.length >= 2) {
      minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0])
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1])
      found = true
    }
  }

  function visitCoords(coords: unknown) {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === "number") { visitCoord(coords as number[]); return }
    coords.forEach(visitCoords)
  }

  for (const f of fc.features) {
    if (f.geometry) visitCoords((f.geometry as { coordinates: unknown }).coordinates)
  }
  return found ? [minLng, minLat, maxLng, maxLat] : null
}

function valueToPercent(val: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))
}

function formatCoord(v: number, axis: "lat" | "lng"): string {
  const abs = Math.abs(v).toFixed(4)
  const dir = axis === "lat" ? (v >= 0 ? "N" : "S") : (v >= 0 ? "E" : "W")
  return `${abs}° ${dir}`
}

// ── DataSourceBanner ──────────────────────────────────────────────────────────

function DataSourceBanner({ source, note, fetchedAt, dk }: {
  source?:    DataSource
  note?:      string
  fetchedAt?: string
  dk:         boolean
}) {
  if (!source) return null

  const configs: Record<DataSource, {
    icon:    React.ReactNode
    label:   string
    detail:  string
    cls:     string
    showTs:  boolean   // whether to display the fetchedAt timestamp
  }> = {
    "gee": {
      icon:    <CheckCircle2 className="size-3.5 shrink-0" />,
      label:   "Dados reais",
      detail:  "Sentinel-2 L2A · 10 m · Google Earth Engine · últimos 90 dias",
      cls:     dk
        ? "bg-emerald-900/30 border-emerald-700/50 text-emerald-300"
        : "bg-emerald-50 border-emerald-300 text-emerald-800",
      showTs:  true,
    },
    "mock": {
      icon:    <AlertCircle className="size-3.5 shrink-0" />,
      label:   "Dados simulados",
      detail:  note ?? "Configure GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY e GEE_PROJECT para dados reais.",
      cls:     dk
        ? "bg-amber-900/30 border-amber-700/50 text-amber-300"
        : "bg-amber-50 border-amber-300 text-amber-800",
      showTs:  false,
    },
    "gee-error": {
      icon:    <WifiOff className="size-3.5 shrink-0" />,
      label:   "Erro ao consultar GEE",
      detail:  note ?? "Verifique GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY e GEE_PROJECT. Exibindo valores simulados.",
      cls:     dk
        ? "bg-red-900/30 border-red-700/50 text-red-300"
        : "bg-red-50 border-red-300 text-red-800",
      showTs:  false,
    },
  }

  const cfg = configs[source]
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs", cfg.cls)}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{cfg.label}</span>
        <span className="mx-1.5 opacity-40">·</span>
        <span className="opacity-80">{cfg.detail}</span>
        {fetchedAt && cfg.showTs && (
          <span className="block mt-0.5 opacity-60 text-[10px]">
            Consultado em {new Date(fetchedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}
          </span>
        )}
      </div>
    </div>
  )
}

// ── IndexCard component ───────────────────────────────────────────────────────

function IndexCard({
  def, result, loading, isReal, dk,
}: {
  def:     typeof SPECTRAL_INDICES[number]
  result?: IndexResult
  loading: boolean
  isReal:  boolean
  dk:      boolean
}) {
  const T    = th(dk)
  const Icon = def.icon
  const pct  = result ? valueToPercent(result.mean, -1, 1) : 50

  return (
    <div className={cn("rounded-xl border p-3 flex flex-col gap-2 relative overflow-hidden", T.card)}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div
          className="size-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: def.color + "22", color: def.color }}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-bold", T.text)}>{def.label}</p>
          <p className={cn("text-[10px] leading-tight truncate", T.muted)}>{def.fullName}</p>
        </div>

        {/* Real vs simulated badge */}
        {result && !loading && (
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-px rounded-full border shrink-0 leading-tight",
            isReal
              ? dk ? "bg-emerald-900/40 border-emerald-700 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700"
              : dk ? "bg-amber-900/40  border-amber-700  text-amber-400"  : "bg-amber-50  border-amber-300  text-amber-700",
          )}>
            {isReal ? "REAL" : "SIM"}
          </span>
        )}

        {result && (
          <span
            className="text-sm font-bold tabular-nums shrink-0"
            style={{ color: def.color }}
          >
            {result.mean >= 0 ? "+" : ""}{result.mean.toFixed(2)}
          </span>
        )}
        {loading && (
          <span className={cn("text-[10px] italic flex items-center gap-1", T.muted)}>
            <RefreshCw className="size-3 animate-spin" /> Calculando…
          </span>
        )}
      </div>

      {/* Color bar */}
      <div className="relative">
        <div
          className="h-1.5 rounded-full w-full"
          style={{ background: `linear-gradient(to right, ${def.gradFrom}, ${def.gradTo})` }}
        />
        {result && (
          <div
            className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-white shadow"
            style={{ left: `${pct}%`, transform: "translate(-50%, -50%)", backgroundColor: def.color }}
          />
        )}
      </div>

      {/* Range */}
      {result ? (
        <div className="flex justify-between text-[10px] tabular-nums">
          <span className={T.muted}>min {result.min >= 0 ? "+" : ""}{result.min.toFixed(2)}</span>
          <span className={T.muted}>faixa: {def.range}</span>
          <span className={T.muted}>max {result.max >= 0 ? "+" : ""}{result.max.toFixed(2)}</span>
        </div>
      ) : (
        <p className={cn("text-[10px]", T.muted)}>faixa: {def.range}</p>
      )}

      {/* Formula */}
      <p className={cn("text-[10px] font-mono opacity-60 truncate", T.text)} title={def.formula}>
        {def.formula}
      </p>

      {/* Description */}
      <p className={cn("text-[10px] leading-relaxed", T.muted)}>{def.desc}</p>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function LayerAnalysisModal({
  layer,
  isDark,
  onClose,
}: {
  layer:   MapLayer
  isDark:  boolean
  onClose: () => void
}) {
  const T    = th(isDark)
  const dk   = isDark
  const bbox = getBoundingBox(layer.geojson)

  const [data,    setData]    = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch("/api/aoi-analysis/stats", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ geojson: layer.geojson, indices: SPECTRAL_INDICES.map(i => i.id) }),
    })
      .then(r => r.json())
      .then((d: AnalysisData) => setData({ ...d, fetchedAt: new Date().toISOString() }))
      .catch(() => setError("Não foi possível carregar a análise. Tente novamente."))
      .finally(() => setLoading(false))
  }, [layer.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isRealData       = data?.source === "gee"
  // Show the "configure" link only when no real-data source is confirmed yet
  const hasRealDataSource = isRealData

  const featureCount = layer.geojson.features.length

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div
        className={cn(
          "rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border",
          T.panel,
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0", T.header)}>
          <div className="flex items-center gap-2.5">
            <div
              className="size-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: layer.color + "22", color: layer.color }}
            >
              <BarChart2 className="size-4" />
            </div>
            <div>
              <p className={cn("font-semibold text-sm", T.text)}>{layer.name}</p>
              <p className={cn("text-[10px]", T.muted)}>Análise espectral e classificação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "size-8 flex items-center justify-center rounded-lg transition-colors",
              dk ? "hover:bg-zinc-700 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500",
            )}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-6">

          {/* ── Section A — Identificação da Área ─────────────────────────── */}
          <section>
            <SectionHeader icon={<Layers2 className="size-3.5" />} label="Identificação da Área" T={T} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <MetaCard label="Tipo" value={layer.layerType === "aoi" ? "Área Alvo (AOI)" : layer.layerType === "restriction" ? "Restrição" : "Não definido"} color={layer.color} T={T} />
              <MetaCard label="Área total" value={`${layer.totalAreaHa.toLocaleString("pt-BR")} ha`} color={layer.color} T={T} />
              <MetaCard label="Feições" value={String(featureCount)} color={layer.color} T={T} />
              <MetaCard label="Fonte" value={layer.source === "drawn" ? "Desenhado" : layer.source === "upload" ? "Upload" : "Exemplo"} color={layer.color} T={T} />
            </div>

            {bbox && (
              <div className={cn("mt-3 rounded-xl border p-3 text-xs font-mono", T.card)}>
                <p className={cn("text-[10px] uppercase font-semibold tracking-wider mb-2", T.label)}>Bounding Box</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <span className={T.muted}>Oeste: <span className={T.text}>{formatCoord(bbox[0], "lng")}</span></span>
                  <span className={T.muted}>Sul:   <span className={T.text}>{formatCoord(bbox[1], "lat")}</span></span>
                  <span className={T.muted}>Leste: <span className={T.text}>{formatCoord(bbox[2], "lng")}</span></span>
                  <span className={T.muted}>Norte: <span className={T.text}>{formatCoord(bbox[3], "lat")}</span></span>
                </div>
              </div>
            )}
          </section>

          {/* ── Section B — Índices Espectrais ────────────────────────────── */}
          <section>
            <div className="flex items-start justify-between gap-2 mb-3">
              <SectionHeader icon={<FlaskConical className="size-3.5" />} label="Índices Espectrais" T={T} />
              {!hasRealDataSource && !loading && (
                <a
                  href="https://developers.google.com/earth-engine/guides/service_account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-sky-500 hover:text-sky-400 transition-colors shrink-0 mt-0.5"
                >
                  Configurar GEE <ExternalLink className="size-2.5" />
                </a>
              )}
            </div>

            {/* ── Data source banner — shown once all data loads ── */}
            {!loading && !error && (
              <div className="mb-3">
                <DataSourceBanner
                  source={data?.source}
                  note={data?.note}
                  fetchedAt={data?.fetchedAt}
                  dk={dk}
                />
              </div>
            )}

            {error ? (
              <div className={cn("flex items-center gap-2 rounded-xl border p-3 text-xs", dk ? "bg-red-900/20 border-red-700/50 text-red-300" : "bg-red-50 border-red-200 text-red-700")}>
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SPECTRAL_INDICES.map(def => (
                  <IndexCard
                    key={def.id}
                    def={def}
                    result={data?.indices[def.id]}
                    loading={loading}
                    isReal={isRealData}
                    dk={dk}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Section C — Classificação do Uso do Solo ──────────────────── */}
          <section>
            <SectionHeader icon={<TreePine className="size-3.5" />} label="Classificação do Uso do Solo (Código Florestal)" T={T} />

            {data?.landuse ? (
              <>
                <div className={cn("mt-3 rounded-xl border overflow-hidden", T.table)}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={T.tableTh}>
                        <th className="text-left p-2.5 font-semibold uppercase tracking-wide text-[10px]">Categoria</th>
                        <th className="text-right p-2.5 font-semibold uppercase tracking-wide text-[10px]">%</th>
                        <th className="text-right p-2.5 font-semibold uppercase tracking-wide text-[10px]">ha</th>
                        <th className="w-24 p-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.landuse).map(([cat, pct]) => {
                        const ha  = ((pct / 100) * layer.totalAreaHa).toFixed(1)
                        const col = LANDUSE_COLORS[cat] ?? "#6b7280"
                        return (
                          <tr key={cat} className={cn("border-t", T.tableRow)}>
                            <td className="p-2.5 flex items-center gap-2">
                              <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: col }} />
                              <span className={T.text}>{cat}</span>
                            </td>
                            <td className={cn("p-2.5 text-right tabular-nums font-medium", T.text)}>{pct.toFixed(1)}%</td>
                            <td className={cn("p-2.5 text-right tabular-nums", T.muted)}>{ha}</td>
                            <td className="p-2.5">
                              <div className={cn("h-1.5 rounded-full overflow-hidden", dk ? "bg-zinc-700" : "bg-zinc-200")}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: col }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className={cn("mt-2 flex items-center gap-2 rounded-xl border p-2.5 text-[10px]",
                  dk ? "bg-amber-900/20 border-amber-700/40 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
                  <AlertCircle className="size-3 shrink-0" />
                  <span>
                    <strong>Dados simulados</strong> — integração MapBiomas não configurada.{" "}
                    <a href="https://mapbiomas.org/api" target="_blank" rel="noopener noreferrer" className="underline">
                      Ver documentação
                    </a>{" "}
                    para dados reais da Coleção 9.
                  </span>
                </div>
              </>
            ) : loading ? (
              <p className={cn("text-xs mt-3 text-center py-6", T.muted)}>Carregando classificação…</p>
            ) : (
              <div className={cn("mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs", dk ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600")}>
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <p>
                  Integração MapBiomas não configurada.{" "}
                  <a
                    href="https://mapbiomas.org/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                  >
                    Ver documentação da API
                  </a>
                </p>
              </div>
            )}
          </section>

          {/* ── Section D — Tipologia de Vegetação ────────────────────────── */}
          <section>
            <SectionHeader icon={<Activity className="size-3.5" />} label="Tipologia de Vegetação (IBGE)" T={T} />
            <p className={cn("text-[10px] mt-1 mb-3", T.muted)}>
              Classificação da cobertura vegetal conforme mapeamento IBGE / Vegetação do Brasil.
              Dados via WMS IBGE — valores ilustrativos na ausência de integração configurada.
            </p>
            <div className="space-y-2">
              {VEGETATION_TYPES.map(vt => (
                <div key={vt.label} className="flex items-center gap-2.5">
                  <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: vt.color }} />
                  <span className={cn("text-xs flex-1", T.text)}>{vt.label}</span>
                  <div className={cn("h-2 rounded-full overflow-hidden flex-1 max-w-24", dk ? "bg-zinc-700" : "bg-zinc-200")}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${vt.pct * 3}%`, backgroundColor: vt.color }}
                    />
                  </div>
                  <span className={cn("text-[10px] tabular-nums w-8 text-right", T.muted)}>{vt.pct}%</span>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className={cn("px-5 py-3 border-t flex items-center justify-between flex-shrink-0 text-[10px]", T.header)}>
          <span className={cn("flex items-center gap-1.5", T.muted)}>
            {!loading && data?.source === "gee" && (
              <><CheckCircle2 className="size-3 text-emerald-500" /><span className="text-emerald-500 font-medium">Dados reais</span> · Google Earth Engine</>
            )}
            {!loading && data?.source === "mock" && (
              <><AlertCircle className="size-3 text-amber-500" /><span className="text-amber-500 font-medium">Dados simulados</span> · Configure GEE</>
            )}
            {!loading && data?.source === "gee-error" && (
              <><WifiOff className="size-3 text-red-500" /><span className="text-red-500 font-medium">Erro GEE</span> · Exibindo simulação</>
            )}
            {loading && <><RefreshCw className="size-3 animate-spin" /> Carregando análise…</>}
          </span>
          <button
            onClick={onClose}
            className={cn(
              "px-3 py-1.5 text-xs border rounded-lg transition-colors",
              dk
                ? "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
            )}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon, label, T,
}: {
  icon:  React.ReactNode
  label: string
  T:     ReturnType<typeof th>
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("flex items-center", T.muted)}>{icon}</span>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", T.label)}>{label}</p>
    </div>
  )
}

function MetaCard({
  label, value, color, T,
}: {
  label: string
  value: string
  color: string
  T:     ReturnType<typeof th>
}) {
  return (
    <div className={cn("rounded-xl border p-3", T.card)}>
      <p className={cn("text-[10px] mb-0.5", T.muted)}>{label}</p>
      <p className="text-xs font-semibold truncate" style={{ color }} title={value}>{value}</p>
    </div>
  )
}
