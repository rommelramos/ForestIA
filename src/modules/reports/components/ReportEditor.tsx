"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Restriction {
  id: number
  name: string
  notes: string
  features: number
  sourceType: string
}

interface ReportContent {
  restrictions?: Restriction[]
  geospatialAnalysis?: string
  vegetationAnalysis?: string
  legalConsiderations?: string
  recommendations?: string
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

function calcFinal(geo: string, veg: string, con: string): string {
  const g = parseFloat(geo), v = parseFloat(veg), c = parseFloat(con)
  if (isNaN(g) && isNaN(v) && isNaN(c)) return ""
  const vals = [g, v, c].filter(n => !isNaN(n))
  return (vals.reduce((s, n) => s + n, 0) / vals.length).toFixed(2)
}

export function ReportEditor({ report }: Props) {
  const router  = useRouter()
  const content = (report.content ?? {}) as ReportContent

  const [title,    setTitle]    = useState(report.title)
  const [status,   setStatus]   = useState(report.status)
  const [geoScore, setGeoScore] = useState(report.geospatialScore ?? "")
  const [vegScore, setVegScore] = useState(report.vegetationScore ?? "")
  const [conScore, setConScore] = useState(report.consultantScore ?? "")
  const [conclusion, setConclusion] = useState(report.conclusion ?? "")

  const [geoText,  setGeoText]  = useState(content.geospatialAnalysis ?? "")
  const [vegText,  setVegText]  = useState(content.vegetationAnalysis ?? "")
  const [legalText, setLegal]   = useState(content.legalConsiderations ?? "")
  const [recText,  setRec]      = useState(content.recommendations ?? "")

  const [saving,     setSaving]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)

  const restrictions = content.restrictions ?? []
  const finalScore   = calcFinal(geoScore, vegScore, conScore)

  const save = async (extraFields: Record<string, unknown> = {}) => {
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
          content: { ...content, geospatialAnalysis: geoText, vegetationAnalysis: vegText, legalConsiderations: legalText, recommendations: recText },
          ...extraFields,
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
      {/* Header */}
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

      {/* Title + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {STATUS_OPTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {currentStatus && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${currentStatus.cls}`}>
              {currentStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* Scores */}
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
              <input
                type="number" min={0} max={10} step={0.1}
                value={val}
                onChange={e => setter(e.target.value)}
                placeholder="—"
                className="w-full bg-transparent text-lg font-bold text-gray-900 focus:outline-none"
              />
            </div>
          ))}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 mb-1">Score Final</p>
            <p className="text-lg font-bold text-green-800">{finalScore || "—"}</p>
          </div>
        </div>
      </div>

      {/* Restrictions (read-only) */}
      {restrictions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sobreposições e Restrições
            <span className="ml-2 text-xs font-normal text-gray-400">({restrictions.length})</span>
          </label>
          <div className="space-y-2">
            {restrictions.map(r => (
              <div key={r.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{r.name}</span>
                  <span className="text-xs bg-white border text-gray-500 px-2 py-0.5 rounded-full">
                    {r.features} feição{r.features !== 1 ? "ões" : ""}
                  </span>
                </div>
                {r.notes && <p className="text-xs text-gray-600 mt-1 italic">{r.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content sections */}
      {([
        ["Análise Geoespacial",       geoText,  setGeoText,  "Descreva a análise geoespacial da área…"],
        ["Análise de Vegetação",      vegText,  setVegText,  "Descreva as condições de vegetação…"],
        ["Aspectos Legais e Ambientais", legalText, setLegal, "Descreva as implicações legais e ambientais…"],
        ["Recomendações",             recText,  setRec,      "Liste as recomendações técnicas…"],
      ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
        <div key={label}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <textarea
            value={val}
            onChange={e => setter(e.target.value)}
            rows={4}
            placeholder={ph}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
        </div>
      ))}

      {/* Conclusion */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Conclusão</label>
        <textarea
          value={conclusion}
          onChange={e => setConclusion(e.target.value)}
          rows={3}
          placeholder="Conclusão geral sobre a viabilidade do projeto…"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Relatório salvo com sucesso.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-gray-400">
          {report.isPublished
            ? `Publicado ${report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("pt-BR") : ""}`
            : "Não publicado para o cliente"}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 font-medium">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {!report.isPublished && (
            <button
              type="button"
              onClick={publish}
              disabled={publishing || saving}
              className="px-5 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-40 font-medium">
              {publishing ? "Publicando…" : "Publicar para cliente"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
