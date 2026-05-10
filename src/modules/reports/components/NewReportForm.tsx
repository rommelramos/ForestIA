"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Analysis {
  id: number
  name: string | null
  notes: string | null
  sourceType: string | null
  geojson: string | null
}

interface Project {
  id: number
  name: string
  municipality: string | null
  state: string | null
  areaHectares: string | null
}

interface Props {
  project: Project
  analyses: Analysis[]
}

function featureCount(geojson: string | null): number {
  if (!geojson) return 0
  try {
    const fc = JSON.parse(geojson) as { features?: unknown[] }
    return fc.features?.length ?? 0
  } catch { return 0 }
}

const SOURCE_LABELS: Record<string, string> = {
  upload: "Upload", manual: "Desenhado", sicar: "SICAR", layer: "Camada",
}

export function NewReportForm({ project, analyses }: Props) {
  const router = useRouter()

  const [title, setTitle]                   = useState(`Relatório de Viabilidade — ${project.name}`)
  const [expandedId, setExpandedId]         = useState<number | null>(analyses[0]?.id ?? null)
  const [recommendations, setRecommendations] = useState<Record<number, string>>({})
  const [geospatialAnalysis, setGeospatial] = useState("")
  const [vegetationAnalysis, setVegetation] = useState("")
  const [legalConsiderations, setLegal]     = useState("")
  const [conclusion, setConclusion]         = useState("")
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const restrictions = analyses.map(a => ({
    id: a.id,
    name: a.name ?? "Sem nome",
    notes: a.notes ?? "",
    features: featureCount(a.geojson),
    sourceType: a.sourceType ?? "manual",
  }))

  const filledCount = restrictions.filter(r => recommendations[r.id]?.trim()).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: title.trim(),
          content: {
            restrictions: restrictions.map(r => ({
              ...r,
              recommendation: recommendations[r.id] ?? "",
            })),
            geospatialAnalysis,
            vegetationAnalysis,
            legalConsiderations,
          },
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Erro ao criar relatório")
        return
      }
      const data = await res.json()
      // save conclusion via PATCH right after creation
      if (conclusion.trim()) {
        await fetch(`/api/reports/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conclusion: conclusion.trim() }),
        })
      }
      router.push(`/dashboard/projects/${project.id}/report/${data.id}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Novo Relatório de Viabilidade</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.name}
            {project.municipality && ` · ${project.municipality}${project.state ? `/${project.state}` : ""}`}
            {project.areaHectares && ` · ${Number(project.areaHectares).toLocaleString("pt-BR")} ha`}
          </p>
        </div>
        <button type="button" onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-700 shrink-0">
          ← Voltar
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          required minLength={3}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* ── Restrictions accordion ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Análise por Sobreposição
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({restrictions.length} registro{restrictions.length !== 1 ? "s" : ""})
            </span>
          </label>
          {restrictions.length > 0 && (
            <span className="text-xs text-gray-400">{filledCount}/{restrictions.length} com análise</span>
          )}
        </div>

        {restrictions.length === 0 ? (
          <div className="border border-dashed rounded-xl p-6 text-center text-sm text-gray-400">
            Nenhuma sobreposição salva para este projeto.
            <br />
            <span className="text-xs">Acesse a aba Análise Geoespacial para registrar restrições.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {restrictions.map(r => {
              const isOpen  = expandedId === r.id
              const hasRec  = !!recommendations[r.id]?.trim()
              return (
                <div key={r.id}
                  className={`border rounded-xl overflow-hidden transition-colors ${
                    hasRec ? "border-green-300 bg-green-50/30" : "border-gray-200 bg-white"
                  }`}>
                  {/* ── Card header (click to expand) ── */}
                  <button type="button"
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${hasRec ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{r.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {r.features} feição{r.features !== 1 ? "ões" : ""}
                          </span>
                          <span className="text-xs text-gray-400">{SOURCE_LABELS[r.sourceType] ?? r.sourceType}</span>
                        </div>
                        {r.notes && !isOpen && (
                          <p className="text-xs text-gray-500 mt-0.5 italic truncate">{r.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasRec && (
                        <span className="text-xs text-green-600 font-medium">✓ Preenchida</span>
                      )}
                      <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* ── Expanded body ── */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                      {r.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-amber-700 mb-0.5">Observação registrada no campo</p>
                          <p className="text-xs text-amber-900 italic">{r.notes}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Análise técnica e recomendação
                        </label>
                        <textarea
                          autoFocus
                          value={recommendations[r.id] ?? ""}
                          onChange={e => setRecommendations(prev => ({ ...prev, [r.id]: e.target.value }))}
                          rows={5}
                          placeholder={`Descreva a análise técnica desta sobreposição e as ações recomendadas para "${r.name}"…\n\nEx: sobreposição limítrofe de ${r.features} feição(ões), necessária verificação junto ao órgão competente…`}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white"
                        />
                      </div>
                      {/* Navigation between restrictions */}
                      <div className="flex justify-between items-center pt-1">
                        <button type="button"
                          onClick={() => {
                            const idx = restrictions.findIndex(x => x.id === r.id)
                            if (idx > 0) setExpandedId(restrictions[idx - 1].id)
                          }}
                          disabled={restrictions.findIndex(x => x.id === r.id) === 0}
                          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">
                          ← Anterior
                        </button>
                        <span className="text-xs text-gray-400">
                          {restrictions.findIndex(x => x.id === r.id) + 1} / {restrictions.length}
                        </span>
                        <button type="button"
                          onClick={() => {
                            const idx = restrictions.findIndex(x => x.id === r.id)
                            if (idx < restrictions.length - 1) setExpandedId(restrictions[idx + 1].id)
                            else setExpandedId(null)
                          }}
                          className="text-xs text-green-600 hover:text-green-800 font-medium">
                          {restrictions.findIndex(x => x.id === r.id) < restrictions.length - 1 ? "Próxima →" : "Concluir ✓"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── General sections ── */}
      {([
        ["Análise Geoespacial", geospatialAnalysis, setGeospatial,
          "Descreva características gerais da área, histórico de uso, classificação multitemporal, bases vetoriais analisadas…"],
        ["Análise de Vegetação", vegetationAnalysis, setVegetation,
          "Descreva cobertura florestal, índices NDVI/EVI/SAVI, biomassa estimada, espécies identificadas…"],
        ["Aspectos Legais e Ambientais", legalConsiderations, setLegal,
          "Descreva enquadramento no Código Florestal, situação do CAR, APPs, Reserva Legal, vias de licenciamento aplicáveis…"],
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
          placeholder="Síntese das conclusões sobre a viabilidade, potencial produtivo e condicionantes para implementação do PMFS…"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-gray-400">
          {filledCount > 0
            ? `${filledCount} de ${restrictions.length} sobreposições analisadas`
            : restrictions.length > 0 ? "Nenhuma sobreposição analisada ainda" : ""}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={submitting || !title.trim()}
            className="px-6 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-40 font-medium">
            {submitting ? "Criando rascunho…" : "Criar Rascunho"}
          </button>
        </div>
      </div>
    </form>
  )
}
