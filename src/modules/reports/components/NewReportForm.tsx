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

  const [title, setTitle]                     = useState(`Relatório de Viabilidade — ${project.name}`)
  const [geospatialAnalysis, setGeospatial]   = useState("")
  const [vegetationAnalysis, setVegetation]   = useState("")
  const [legalConsiderations, setLegal]       = useState("")
  const [recommendations, setRecommendations] = useState("")
  const [submitting, setSubmitting]           = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  const restrictions = analyses.map(a => ({
    id: a.id,
    name: a.name ?? "Sem nome",
    notes: a.notes ?? "",
    features: featureCount(a.geojson),
    sourceType: a.sourceType ?? "manual",
  }))

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
          content: { restrictions, geospatialAnalysis, vegetationAnalysis, legalConsiderations, recommendations },
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Erro ao criar relatório")
        return
      }
      const data = await res.json()
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
          value={title}
          onChange={e => setTitle(e.target.value)}
          required minLength={3}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Restrictions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sobreposições e Restrições Salvas
          <span className="ml-2 text-xs font-normal text-gray-400">({restrictions.length} registro{restrictions.length !== 1 ? "s" : ""})</span>
        </label>
        {restrictions.length === 0 ? (
          <div className="border border-dashed rounded-lg p-4 text-center text-sm text-gray-400">
            Nenhuma sobreposição salva para este projeto.
            <br />
            <span className="text-xs">Acesse a aba Análise Geoespacial para registrar restrições.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {restrictions.map(r => (
              <div key={r.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{r.name}</span>
                  <span className="text-xs bg-white border text-gray-500 px-2 py-0.5 rounded-full">
                    {r.features} feição{r.features !== 1 ? "ões" : ""}
                  </span>
                  <span className="text-xs text-gray-400">
                    {SOURCE_LABELS[r.sourceType] ?? r.sourceType}
                  </span>
                </div>
                {r.notes && (
                  <p className="text-xs text-gray-600 mt-1.5 italic">{r.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text sections */}
      {([
        ["Análise Geoespacial", geospatialAnalysis, setGeospatial,
          "Descreva a análise geoespacial da área, características do terreno, delimitações, sobreposições identificadas…"],
        ["Análise de Vegetação", vegetationAnalysis, setVegetation,
          "Descreva as condições de vegetação, cobertura florestal, índices NDVI/EVI/SAVI observados…"],
        ["Aspectos Legais e Ambientais", legalConsiderations, setLegal,
          "Descreva as implicações legais, enquadramento no Código Florestal, CAR, APPs, Reserva Legal, áreas protegidas…"],
        ["Recomendações", recommendations, setRecommendations,
          "Liste as recomendações técnicas para viabilização do projeto florestal…"],
      ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, placeholder]) => (
        <div key={label}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <textarea
            value={val}
            onChange={e => setter(e.target.value)}
            rows={4}
            placeholder={placeholder}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
        </div>
      ))}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={submitting || !title.trim()}
          className="px-6 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-40 font-medium">
          {submitting ? "Criando rascunho…" : "Criar Rascunho"}
        </button>
      </div>
    </form>
  )
}
