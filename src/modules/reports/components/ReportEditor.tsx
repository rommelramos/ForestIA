"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Restriction {
  id: number
  name: string
  notes: string
  features: number
  sourceType: string
  recommendation?: string
}

interface ReportContent {
  restrictions?: Restriction[]
  geospatialAnalysis?: string
  vegetationAnalysis?: string
  legalConsiderations?: string
}

interface Report {
  id: number
  projectId: number
  version: number
  title: string
  status: string
  geospatialScore: string | null
  vegetationScore: string | null
  consultantScore: string | null
  finalScore: string | null
  conclusion: string | null
  content: Record<string, unknown> | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Props {
  report: Report
}

const STATUS_OPTS = [
  { value: "draft",     label: "Rascunho",   cls: "bg-gray-100 text-gray-700" },
  { value: "review",    label: "Em revisão", cls: "bg-yellow-100 text-yellow-700" },
  { value: "approved",  label: "Aprovado",   cls: "bg-blue-100 text-blue-700" },
  { value: "published", label: "Publicado",  cls: "bg-green-100 text-green-700" },
]

const SOURCE_LABELS: Record<string, string> = {
  upload: "Upload", manual: "Desenhado", sicar: "SICAR", layer: "Camada",
}

function calcFinal(geo: string, veg: string, con: string): string {
  const g = parseFloat(geo), v = parseFloat(veg), c = parseFloat(con)
  const vals = [g, v, c].filter(n => !isNaN(n))
  if (vals.length === 0) return ""
  return (vals.reduce((s, n) => s + n, 0) / vals.length).toFixed(2)
}

export function ReportEditor({ report }: Props) {
  const router  = useRouter()
  const content = (report.content ?? {}) as ReportContent

  const initRestrictions = content.restrictions ?? []

  // Per-restriction recommendation state keyed by id
  const [restrictionRecs, setRestrictionRecs] = useState<Record<number, string>>(
    Object.fromEntries(initRestrictions.map(r => [r.id, r.recommendation ?? ""]))
  )
  const [expandedId, setExpandedId] = useState<number | null>(initRestrictions[0]?.id ?? null)

  const [title,    setTitle]    = useState(report.title)
  const [status,   setStatus]   = useState(report.status)
  const [geoScore, setGeoScore] = useState(report.geospatialScore ?? "")
  const [vegScore, setVegScore] = useState(report.vegetationScore ?? "")
  const [conScore, setConScore] = useState(report.consultantScore ?? "")
  const [conclusion, setConclusion] = useState(report.conclusion ?? "")

  const [geoText,   setGeoText]  = useState(content.geospatialAnalysis ?? "")
  const [vegText,   setVegText]  = useState(content.vegetationAnalysis ?? "")
  const [legalText, setLegal]    = useState(content.legalConsiderations ?? "")

  const [saving,     setSaving]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)

  const finalScore = calcFinal(geoScore, vegScore, conScore)
  const filledCount = initRestrictions.filter(r => restrictionRecs[r.id]?.trim()).length

  const buildContent = () => ({
    ...content,
    restrictions: initRestrictions.map(r => ({
      ...r,
      recommendation: restrictionRecs[r.id] ?? r.recommendation ?? "",
    })),
    geospatialAnalysis: geoText,
    vegetationAnalysis: vegText,
    legalConsiderations: legalText,
  })

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          status,
          conclusion: conclusion.trim(),
          ...(geoScore ? { geospatialScore: parseFloat(geoScore) } : {}),
          ...(vegScore ? { vegetationScore: parseFloat(vegScore) } : {}),
          ...(conScore ? { consultantScore: parseFloat(conScore) } : {}),
          ...(finalScore ? { finalScore: parseFloat(finalScore) } : {}),
          content: buildContent(),
          ...extra,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Erro ao salvar")
        return false
      }
      setSaved(true)
      return true
    } catch {
      setError("Erro de conexão.")
      return false
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    setPublishing(true)
    const ok = await save({ isPublished: true, status: "published" })
    if (ok) router.refresh()
    setPublishing(false)
  }

  const currentStatus = STATUS_OPTS.find(s => s.value === status)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Relatório de Viabilidade</h2>
            <span className="text-xs text-gray-400">v{report.version}</span>
            {report.isPublished && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Publicado para o cliente
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Criado em {new Date(report.createdAt).toLocaleDateString("pt-BR")} ·
            Última edição {new Date(report.updatedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <button type="button" onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-700 shrink-0">
          ← Voltar
        </button>
      </div>

      {/* ── Title + Status ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {currentStatus && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${currentStatus.cls}`}>
              {currentStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* ── Scores ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pontuações (0–10)</label>
        <div className="grid grid-cols-4 gap-3">
          {([
            ["Geoespacial", geoScore, setGeoScore],
            ["Vegetação",   vegScore, setVegScore],
            ["Consultor",   conScore, setConScore],
          ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
            <div key={label} className="bg-gray-50 border rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <input type="number" min={0} max={10} step={0.1}
                value={val} onChange={e => setter(e.target.value)} placeholder="—"
                className="w-full bg-transparent text-lg font-bold text-gray-900 focus:outline-none" />
            </div>
          ))}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 mb-1">Score Final</p>
            <p className="text-lg font-bold text-green-800">{finalScore || "—"}</p>
          </div>
        </div>
      </div>

      {/* ── Restrictions accordion ── */}
      {initRestrictions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Análise por Sobreposição
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({initRestrictions.length} registro{initRestrictions.length !== 1 ? "s" : ""})
              </span>
            </label>
            <span className="text-xs text-gray-400">{filledCount}/{initRestrictions.length} com análise</span>
          </div>

          <div className="space-y-2">
            {initRestrictions.map(r => {
              const isOpen = expandedId === r.id
              const hasRec = !!restrictionRecs[r.id]?.trim()
              return (
                <div key={r.id}
                  className={`border rounded-xl overflow-hidden transition-colors ${
                    hasRec ? "border-green-300 bg-green-50/30" : "border-gray-200 bg-white"
                  }`}>
                  {/* Card header */}
                  <button type="button"
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${hasRec ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{r.name}</span>
                          <span className="text-xs text-gray-400">{SOURCE_LABELS[r.sourceType] ?? r.sourceType}</span>
                        </div>
                        {r.notes && !isOpen && (
                          <p className="text-xs text-gray-500 mt-0.5 italic truncate">{r.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasRec && <span className="text-xs text-green-600 font-medium">✓ Preenchida</span>}
                      <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                      {r.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-amber-700 mb-0.5">Observação de campo</p>
                          <p className="text-xs text-amber-900 italic">{r.notes}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Análise técnica e recomendação
                        </label>
                        <textarea
                          autoFocus
                          value={restrictionRecs[r.id] ?? ""}
                          onChange={e => setRestrictionRecs(prev => ({ ...prev, [r.id]: e.target.value }))}
                          rows={5}
                          placeholder={`Análise específica desta sobreposição e ações recomendadas…`}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white"
                        />
                      </div>
                      {/* Navigation */}
                      <div className="flex justify-between items-center pt-1">
                        <button type="button"
                          onClick={() => {
                            const idx = initRestrictions.findIndex(x => x.id === r.id)
                            if (idx > 0) setExpandedId(initRestrictions[idx - 1].id)
                          }}
                          disabled={initRestrictions.findIndex(x => x.id === r.id) === 0}
                          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">
                          ← Anterior
                        </button>
                        <span className="text-xs text-gray-400">
                          {initRestrictions.findIndex(x => x.id === r.id) + 1} / {initRestrictions.length}
                        </span>
                        <button type="button"
                          onClick={() => {
                            const idx = initRestrictions.findIndex(x => x.id === r.id)
                            if (idx < initRestrictions.length - 1) setExpandedId(initRestrictions[idx + 1].id)
                            else setExpandedId(null)
                          }}
                          className="text-xs text-green-600 hover:text-green-800 font-medium">
                          {initRestrictions.findIndex(x => x.id === r.id) < initRestrictions.length - 1
                            ? "Próxima →" : "Concluir ✓"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── General sections ── */}
      {([
        ["Análise Geoespacial", geoText, setGeoText,
          "Características gerais da área, histórico de uso, bases vetoriais analisadas…"],
        ["Análise de Vegetação", vegText, setVegText,
          "Cobertura florestal, índices NDVI/EVI/SAVI, biomassa, espécies identificadas…"],
        ["Aspectos Legais e Ambientais", legalText, setLegal,
          "Enquadramento no Código Florestal, CAR, APPs, Reserva Legal, vias de licenciamento…"],
      ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
        <div key={label}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <textarea value={val} onChange={e => setter(e.target.value)} rows={4} placeholder={ph}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" />
        </div>
      ))}

      {/* Considerações Finais */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Considerações Finais</label>
        <textarea value={conclusion} onChange={e => setConclusion(e.target.value)} rows={4}
          placeholder="Síntese das conclusões sobre viabilidade, potencial produtivo e condicionantes para o PMFS…"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Relatório salvo com sucesso.
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-gray-400">
          {report.isPublished
            ? `Publicado ${report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("pt-BR") : ""}`
            : "Não publicado para o cliente"}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => save()} disabled={saving}
            className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 font-medium">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {!report.isPublished && (
            <button type="button" onClick={publish} disabled={publishing || saving}
              className="px-5 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-40 font-medium">
              {publishing ? "Publicando…" : "Publicar para cliente"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
