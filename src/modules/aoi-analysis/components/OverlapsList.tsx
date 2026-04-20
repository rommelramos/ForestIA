"use client"

import { useState, useEffect, useCallback } from "react"

interface SavedAnalysis {
  id: number
  name: string | null
  notes: string | null
  geojson: string | null
  sourceType: string | null
  status: string
  createdAt: string
}

interface EditState {
  id: number
  name: string
  notes: string
}

interface Props {
  projectId: number
  canManage: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

function featureCount(geojson: string | null): number {
  try {
    const fc = JSON.parse(geojson ?? "{}") as { features?: unknown[] }
    return fc.features?.length ?? 0
  } catch { return 0 }
}

function downloadGeoJSON(geojson: string, name: string) {
  const blob = new Blob([geojson], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${name.replace(/\s+/g, "_")}.geojson`,
  })
  a.click()
  URL.revokeObjectURL(url)
}

export function OverlapsList({ projectId, canManage }: Props) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [loading, setLoading]   = useState(true)
  const [edit, setEdit]         = useState<EditState | null>(null)
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/aoi-analysis?project=${projectId}`)
      if (res.ok) setAnalyses(await res.json())
    } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const startEdit = (a: SavedAnalysis) =>
    setEdit({ id: a.id, name: a.name ?? "", notes: a.notes ?? "" })

  const cancelEdit = () => setEdit(null)

  const saveEdit = async () => {
    if (!edit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/aoi-analysis/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: edit.name.trim(), notes: edit.notes.trim() }),
      })
      if (res.ok) { setEdit(null); await load() }
      else alert("Erro ao salvar. Tente novamente.")
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/aoi-analysis/${deleteId}`, { method: "DELETE" })
      if (res.ok) { setDeleteId(null); await load() }
      else alert("Erro ao remover. Tente novamente.")
    } finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm animate-pulse">
        Carregando sobreposições salvas…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {analyses.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border rounded-xl">
          <p className="text-2xl mb-1">🗺️</p>
          <p className="text-sm">Nenhuma sobreposição salva ainda.</p>
          <p className="text-xs mt-1 text-gray-300">Use o mapa para calcular sobreposições e clique em &ldquo;Salvar&rdquo;.</p>
        </div>
      ) : (
        analyses.map((a) => (
          <div key={a.id} className="bg-white border rounded-xl overflow-hidden">
            {edit?.id === a.id ? (
              /* ── Edit form ── */
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                  <input
                    autoFocus
                    value={edit.name}
                    onChange={e => setEdit(s => s ? { ...s, name: e.target.value } : s)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nome da análise"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                  <textarea
                    value={edit.notes}
                    onChange={e => setEdit(s => s ? { ...s, notes: e.target.value } : s)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                    placeholder="Observações sobre esta sobreposição…"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={cancelEdit}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button onClick={saveEdit} disabled={saving || !edit.name.trim()}
                    className="px-4 py-1.5 text-sm bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-40">
                    {saving ? "Salvando…" : "Salvar alterações"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Row view ── */
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {a.name ?? "Sem nome"}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      {featureCount(a.geojson)} feições
                    </span>
                  </div>
                  {a.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{a.notes}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Salvo em {formatDate(a.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {a.geojson && (
                    <button
                      onClick={() => downloadGeoJSON(a.geojson!, a.name ?? `analise_${a.id}`)}
                      title="Baixar GeoJSON"
                      className="text-xs px-2 py-1.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
                      ↓ GeoJSON
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => startEdit(a)}
                        title="Editar"
                        className="text-xs px-2 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        ✎ Editar
                      </button>
                      <button
                        onClick={() => setDeleteId(a.id)}
                        title="Remover"
                        className="text-xs px-2 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Delete confirmation modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-gray-900">Remover sobreposição</h3>
            <p className="text-sm text-gray-600">
              Esta ação é irreversível. O registro e o GeoJSON salvo serão excluídos permanentemente.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40">
                {deleting ? "Removendo…" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
