"use client"
import { useState } from "react"

interface Suggestion {
  service: string
  rationale: string
  priority: "alta" | "media" | "baixa"
  category: string
}

const PRIORITY_CLS = { alta: "bg-red-100 text-red-700", media: "bg-yellow-100 text-yellow-700", baixa: "bg-green-100 text-green-700" }

export function AiServicesClient({ projectId, isAdmin }: { projectId: number; isAdmin: boolean }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [newPattern, setNewPattern] = useState({ trigger: "", suggestedService: "", rationale: "", category: "" })
  const [savingPattern, setSavingPattern] = useState(false)
  const [showPatternForm, setShowPatternForm] = useState(false)
  const [manualService, setManualService] = useState("")
  const [savingManual, setSavingManual]   = useState(false)

  async function getSuggestions() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/services/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao obter sugestões"); return }
      setSuggestions(data.suggestions ?? [])
    } catch { setError("Erro de conexão") }
    finally { setLoading(false) }
  }

  async function savePattern() {
    if (!newPattern.trigger || !newPattern.suggestedService) return
    setSavingPattern(true)
    try {
      await fetch("/api/services/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPattern),
      })
      setNewPattern({ trigger: "", suggestedService: "", rationale: "", category: "" })
      setShowPatternForm(false)
    } finally { setSavingPattern(false) }
  }

  async function approveManual() {
    if (!manualService.trim()) return
    setSavingManual(true)
    try {
      await fetch("/api/projects/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, notes: manualService }),
      })
      setManualService("")
    } finally { setSavingManual(false) }
  }

  return (
    <div className="space-y-4">
      {/* AI Suggestion */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm text-purple-900">🤖 Sugestão por IA</h3>
            <p className="text-xs text-purple-600">Analisa o contexto do projeto e padrões históricos via Claude AI</p>
          </div>
          <button onClick={getSuggestions} disabled={loading}
            className="text-xs px-3 py-1.5 bg-purple-700 text-white rounded hover:bg-purple-800 disabled:opacity-50 transition-colors">
            {loading ? "Analisando..." : "✨ Gerar sugestões"}
          </button>
        </div>

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{s.service}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_CLS[s.priority] ?? "bg-gray-100"}`}>
                        {s.priority}
                      </span>
                      <span className="text-xs text-gray-400">{s.category}</span>
                    </div>
                    <p className="text-xs text-gray-600">{s.rationale}</p>
                  </div>
                  <button
                    className="text-xs px-2 py-1 bg-green-700 text-white rounded hover:bg-green-800 transition-colors flex-shrink-0"
                    onClick={async () => {
                      await fetch("/api/projects/opportunities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId, notes: `[IA] ${s.service}: ${s.rationale}` }),
                      })
                    }}>
                    ✓ Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual service */}
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-2">✏️ Adicionar serviço manualmente</h3>
        <div className="flex gap-2">
          <input value={manualService} onChange={(e) => setManualService(e.target.value)}
            placeholder="Descreva o serviço a adicionar..."
            className="flex-1 border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
          <button onClick={approveManual} disabled={!manualService.trim() || savingManual}
            className="text-xs px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50 transition-colors">
            {savingManual ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {/* Admin: manage patterns */}
      {isAdmin && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">🗄️ Padrões históricos (base de conhecimento da IA)</h3>
            <button onClick={() => setShowPatternForm(!showPatternForm)}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
              {showPatternForm ? "Cancelar" : "+ Adicionar padrão"}
            </button>
          </div>
          {showPatternForm && (
            <div className="space-y-2 mt-3">
              <textarea value={newPattern.trigger} onChange={(e) => setNewPattern(p => ({...p, trigger: e.target.value}))}
                placeholder="Situação / condição que dispara o serviço (ex: NDVI < 0.3 e área desmatada detectada)"
                className="w-full border rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" rows={2} />
              <input value={newPattern.suggestedService} onChange={(e) => setNewPattern(p => ({...p, suggestedService: e.target.value}))}
                placeholder="Serviço sugerido"
                className="w-full border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />
              <input value={newPattern.rationale} onChange={(e) => setNewPattern(p => ({...p, rationale: e.target.value}))}
                placeholder="Justificativa (opcional)"
                className="w-full border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />
              <div className="flex gap-2">
                <select value={newPattern.category} onChange={(e) => setNewPattern(p => ({...p, category: e.target.value}))}
                  className="border rounded px-2 py-1.5 text-xs flex-1">
                  <option value="">Categoria...</option>
                  {["restauração","monitoramento","licenciamento","consultoria","outros"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={savePattern} disabled={savingPattern}
                  className="text-xs px-3 py-1.5 bg-purple-700 text-white rounded hover:bg-purple-800 disabled:opacity-50 transition-colors">
                  {savingPattern ? "Salvando..." : "Salvar padrão"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
