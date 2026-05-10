"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Restriction {
  id: number; name: string; notes: string; features: number
  sourceType: string; recommendation?: string
}

interface SavedContent {
  carCode?: string; licenseNumbers?: string
  reserveLegalArea?: number; managementArea?: number
  team?: Array<{ name: string; role: string }>
  vectorSources?: number[]
  analysisStartYear?: number; analysisEndYear?: number
  satellites?: string[]; software?: string
  restrictions?: Restriction[]
  geospatialAnalysis?: string; vegetationAnalysis?: string; legalConsiderations?: string
  documents?: { titleDeed?: boolean; registrationCertificate?: boolean; georeferencing?: boolean; sigefCertification?: boolean; ccir?: boolean }
  cuttingCycle?: number; numberOfUpas?: number; areaPerUpa?: number; annualVolumeProductivity?: number
  managementCategories?: Array<{ category: string; areaHa: number; cuttingIntensity: number; possibleVolume: number }>
}

interface Report {
  id: number; projectId: number; version: number; title: string; status: string
  geospatialScore: string | null; vegetationScore: string | null
  consultantScore: string | null; finalScore: string | null
  conclusion: string | null; content: Record<string, unknown> | null
  isPublished: boolean; publishedAt: string | null
  createdAt: string; updatedAt: string
}

interface GeoSource {
  id: number; name: string; organization: string | null; thematicCategory: string | null
}

interface TeamRow { id: string; name: string; role: string }
interface CatRow  { id: string; category: string; areaHa: string; cuttingIntensity: string }

interface Props { report: Report; sources: GeoSource[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: "draft",     label: "Rascunho",   cls: "bg-gray-100 text-gray-700" },
  { value: "review",    label: "Em revisão", cls: "bg-yellow-100 text-yellow-700" },
  { value: "approved",  label: "Aprovado",   cls: "bg-blue-100 text-blue-700" },
  { value: "published", label: "Publicado",  cls: "bg-green-100 text-green-700" },
]

const SOURCE_LABELS: Record<string, string> = {
  upload: "Upload", manual: "Desenhado", sicar: "SICAR", layer: "Camada",
}

const CATEGORY_LABELS: Record<string, string> = {
  vegetacao: "Vegetação", uso_solo: "Uso do Solo", hidrografia: "Hidrografia",
  areas_protegidas: "Áreas Protegidas", fundiario: "Fundiário",
  infraestrutura: "Infraestrutura", clima: "Clima", relevo: "Relevo",
  limites_administrativos: "Limites Administrativos",
}

const SATELLITES = [
  "LANDSAT 5/7/8/9 (NASA)", "COPERNICUS / Sentinel-2A (ESA)",
  "RESOURCESAT (ISRO)", "MapBiomas", "PRODES (INPE)",
]

const DOCUMENTS = [
  { key: "titleDeed",               label: "Título de domínio / Certidão de autenticidade e localização" },
  { key: "registrationCertificate", label: "Certidão de Matrícula atualizada" },
  { key: "georeferencing",          label: "Georreferenciamento" },
  { key: "sigefCertification",      label: "Certificação SIGEF/INCRA" },
  { key: "ccir",                    label: "Certificado de Cadastro de Imóvel Rural (CCIR)" },
] as const

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1985 + 1 }, (_, i) => String(1985 + i)).reverse()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function calcFinal(g: string, v: string, c: string): string {
  const vals = [g, v, c].map(parseFloat).filter(n => !isNaN(n))
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : ""
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportEditor({ report, sources }: Props) {
  const router = useRouter()
  const c = (report.content ?? {}) as SavedContent

  // 1. Basic + Status + Scores
  const [title,    setTitle]    = useState(report.title)
  const [status,   setStatus]   = useState(report.status)
  const [geoScore, setGeoScore] = useState(report.geospatialScore ?? "")
  const [vegScore, setVegScore] = useState(report.vegetationScore ?? "")
  const [conScore, setConScore] = useState(report.consultantScore ?? "")
  const [conclusion, setConclusion] = useState(report.conclusion ?? "")

  // 2. Informações Gerais da Área
  const [carCode,          setCarCode]          = useState(c.carCode ?? "")
  const [licenseNumbers,   setLicenseNumbers]   = useState(c.licenseNumbers ?? "")
  const [reserveLegalArea, setReserveLegalArea] = useState(c.reserveLegalArea ? String(c.reserveLegalArea) : "")
  const [managementArea,   setManagementArea]   = useState(c.managementArea ? String(c.managementArea) : "")

  // 3. Equipe Técnica
  const [team, setTeam] = useState<TeamRow[]>(
    (c.team ?? [{ name: "", role: "" }]).map(m => ({ id: uid(), ...m }))
  )

  // 4. Metodologia
  const [selectedSources,   setSelectedSources]   = useState<number[]>(c.vectorSources ?? [])
  const [analysisStartYear, setStartYear]          = useState(String(c.analysisStartYear ?? 1995))
  const [analysisEndYear,   setEndYear]            = useState(String(c.analysisEndYear ?? CURRENT_YEAR))
  const [satellites,        setSatellites]         = useState<string[]>(c.satellites ?? [])
  const [software,          setSoftware]           = useState(c.software ?? "ArcGIS")

  // 5. Sobreposições
  const initRestrictions = c.restrictions ?? []
  const [expandedId,      setExpandedId]      = useState<number | null>(initRestrictions[0]?.id ?? null)
  const [restrictionRecs, setRestrictionRecs] = useState<Record<number, string>>(
    Object.fromEntries(initRestrictions.map(r => [r.id, r.recommendation ?? ""]))
  )

  // 6–8. Seções gerais
  const [geoText,   setGeoText]  = useState(c.geospatialAnalysis ?? "")
  const [vegText,   setVegText]  = useState(c.vegetationAnalysis ?? "")
  const [legalText, setLegal]    = useState(c.legalConsiderations ?? "")

  // 9. Regularidade Fundiária
  const [documents, setDocuments] = useState({
    titleDeed: false, registrationCertificate: false,
    georeferencing: false, sigefCertification: false, ccir: false,
    ...(c.documents ?? {}),
  })

  // 10. Dados Quantitativos de Manejo
  const [cuttingCycle, setCuttingCycle] = useState(c.cuttingCycle ? String(c.cuttingCycle) : "35")
  const [numberOfUpas, setNumberOfUpas] = useState(c.numberOfUpas ? String(c.numberOfUpas) : "")
  const [areaPerUpa,   setAreaPerUpa]   = useState(c.areaPerUpa ? String(c.areaPerUpa) : "")
  const [annualVolume, setAnnualVolume] = useState(c.annualVolumeProductivity ? String(c.annualVolumeProductivity) : "")
  const [categories,   setCategories]  = useState<CatRow[]>(
    (c.managementCategories ?? []).map(cat => ({
      id: uid(), category: cat.category ?? "",
      areaHa: String(cat.areaHa ?? ""), cuttingIntensity: String(cat.cuttingIntensity ?? ""),
    }))
  )

  // UI state
  const [saving,     setSaving]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)

  const finalScore  = calcFinal(geoScore, vegScore, conScore)
  const filledCount = initRestrictions.filter(r => restrictionRecs[r.id]?.trim()).length

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addTeamMember    = () => setTeam(t => [...t, { id: uid(), name: "", role: "" }])
  const removeTeamMember = (id: string) => setTeam(t => t.filter(m => m.id !== id))
  const updateTeam = (id: string, field: "name" | "role", val: string) =>
    setTeam(t => t.map(m => m.id === id ? { ...m, [field]: val } : m))

  const addCategory    = () => setCategories(cs => [...cs, { id: uid(), category: "", areaHa: "", cuttingIntensity: "" }])
  const removeCategory = (id: string) => setCategories(cs => cs.filter(r => r.id !== id))
  const updateCategory = (id: string, field: keyof CatRow, val: string) =>
    setCategories(cs => cs.map(r => r.id === id ? { ...r, [field]: val } : r))

  const toggleSatellite = (s: string) =>
    setSatellites(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleSource = (id: number) =>
    setSelectedSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // ── Build content ─────────────────────────────────────────────────────────
  const buildContent = (): SavedContent => ({
    carCode: carCode.trim(), licenseNumbers: licenseNumbers.trim(),
    reserveLegalArea: reserveLegalArea ? parseFloat(reserveLegalArea) : undefined,
    managementArea: managementArea ? parseFloat(managementArea) : undefined,
    team: team.filter(m => m.name.trim()).map(({ id: _id, ...m }) => m),
    vectorSources: selectedSources,
    analysisStartYear: parseInt(analysisStartYear),
    analysisEndYear: parseInt(analysisEndYear),
    satellites, software: software.trim(),
    restrictions: initRestrictions.map(r => ({ ...r, recommendation: restrictionRecs[r.id] ?? r.recommendation ?? "" })),
    geospatialAnalysis: geoText, vegetationAnalysis: vegText, legalConsiderations: legalText,
    documents,
    cuttingCycle: cuttingCycle ? parseInt(cuttingCycle) : undefined,
    numberOfUpas: numberOfUpas ? parseInt(numberOfUpas) : undefined,
    areaPerUpa: areaPerUpa ? parseFloat(areaPerUpa) : undefined,
    annualVolumeProductivity: annualVolume ? parseFloat(annualVolume) : undefined,
    managementCategories: categories.filter(c => c.category.trim()).map(c => ({
      category: c.category,
      areaHa: parseFloat(c.areaHa) || 0,
      cuttingIntensity: parseFloat(c.cuttingIntensity) || 0,
      possibleVolume: (parseFloat(c.areaHa) || 0) * (parseFloat(c.cuttingIntensity) || 0),
    })),
  })

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), status, conclusion: conclusion.trim(),
          ...(geoScore ? { geospatialScore: parseFloat(geoScore) } : {}),
          ...(vegScore ? { vegetationScore: parseFloat(vegScore) } : {}),
          ...(conScore ? { consultantScore: parseFloat(conScore) } : {}),
          ...(finalScore ? { finalScore: parseFloat(finalScore) } : {}),
          content: buildContent(), ...extra,
        }),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Erro ao salvar"); return false }
      setSaved(true); return true
    } catch { setError("Erro de conexão."); return false }
    finally { setSaving(false) }
  }

  const publish = async () => {
    setPublishing(true)
    const ok = await save({ isPublished: true, status: "published" })
    if (ok) router.refresh()
    setPublishing(false)
  }

  const currentStatus = STATUS_OPTS.find(s => s.value === status)

  const groupedSources = sources.reduce<Record<string, GeoSource[]>>((acc, s) => {
    const cat = s.thematicCategory ?? "outros"
    ;(acc[cat] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Relatório de Viabilidade</h2>
            <span className="text-xs text-gray-400">v{report.version}</span>
            {report.isPublished && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Publicado</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Criado {new Date(report.createdAt).toLocaleDateString("pt-BR")} · Editado {new Date(report.updatedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700 shrink-0">← Voltar</button>
      </div>

      {/* ── 1. Título + Status ── */}
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
          {currentStatus && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${currentStatus.cls}`}>{currentStatus.label}</span>}
        </div>
      </div>

      {/* ── Pontuações ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pontuações (0–10)</label>
        <div className="grid grid-cols-4 gap-3">
          {([["Geoespacial", geoScore, setGeoScore], ["Vegetação", vegScore, setVegScore], ["Consultor", conScore, setConScore]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
            <div key={label} className="bg-gray-50 border rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <input type="number" min={0} max={10} step={0.1} value={val} onChange={e => setter(e.target.value)} placeholder="—"
                className="w-full bg-transparent text-lg font-bold text-gray-900 focus:outline-none" />
            </div>
          ))}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 mb-1">Score Final</p>
            <p className="text-lg font-bold text-green-800">{finalScore || "—"}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Informações Gerais da Área ── */}
      <Divider label="Informações Gerais da Área" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Código CAR</label>
          <input value={carCode} onChange={e => setCarCode(e.target.value)} placeholder="PA-XXXX-XXXX…"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Licenças (LAR, LPAF…)</label>
          <input value={licenseNumbers} onChange={e => setLicenseNumbers(e.target.value)} placeholder="LAR nº 3109/2015, LAR nº 14903/2025"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Área de Reserva Legal (ha)</label>
          <input type="number" step="0.0001" min="0" value={reserveLegalArea} onChange={e => setReserveLegalArea(e.target.value)} placeholder="57.811,3424"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Área de Manejo Florestal – AMF (ha)</label>
          <input type="number" step="0.0001" min="0" value={managementArea} onChange={e => setManagementArea(e.target.value)} placeholder="41.284,4162"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      {/* ── 3. Equipe Técnica ── */}
      <Divider label="Equipe Técnica" />
      <div className="space-y-2">
        {team.map(m => (
          <div key={m.id} className="flex gap-2 items-center">
            <input value={m.name} onChange={e => updateTeam(m.id, "name", e.target.value)} placeholder="Nome completo"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <input value={m.role} onChange={e => updateTeam(m.id, "role", e.target.value)} placeholder="Engenheiro Florestal, Agrônomo…"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <button type="button" onClick={() => removeTeamMember(m.id)} className="text-red-400 hover:text-red-600 px-2 text-lg leading-none">×</button>
          </div>
        ))}
        <button type="button" onClick={addTeamMember} className="text-sm text-green-700 hover:text-green-900 font-medium">+ Adicionar membro</button>
      </div>

      {/* ── 4. Metodologia ── */}
      <Divider label="Metodologia" />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Bases vetoriais consultadas</label>
        <div className="border rounded-xl overflow-hidden divide-y max-h-56 overflow-y-auto">
          {Object.entries(groupedSources).map(([cat, srcs]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              {srcs.map(s => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedSources.includes(s.id)} onChange={() => toggleSource(s.id)} className="accent-green-700" />
                  <span className="text-sm text-gray-800">{s.name}</span>
                  {s.organization && <span className="text-xs text-gray-400 ml-auto shrink-0">{s.organization}</span>}
                </label>
              ))}
            </div>
          ))}
          {sources.length === 0 && <p className="px-3 py-4 text-xs text-gray-400 text-center">Nenhuma fonte cadastrada.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Período da análise multitemporal</label>
          <div className="flex items-center gap-2">
            <select value={analysisStartYear} onChange={e => setStartYear(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-gray-400">a</span>
            <select value={analysisEndYear} onChange={e => setEndYear(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Software utilizado</label>
          <input value={software} onChange={e => setSoftware(e.target.value)} placeholder="ArcGIS 10.8, QGIS…"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Satélites / programas utilizados</label>
        <div className="flex flex-wrap gap-2">
          {SATELLITES.map(s => (
            <label key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${
              satellites.includes(s) ? "bg-green-700 border-green-700 text-white" : "border-gray-200 text-gray-600 hover:border-green-300"
            }`}>
              <input type="checkbox" className="sr-only" checked={satellites.includes(s)} onChange={() => toggleSatellite(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>

      {/* ── 5. Análise por Sobreposição ── */}
      {initRestrictions.length > 0 && (
        <>
          <Divider label="Análise por Sobreposição" />
          <div>
            <div className="flex justify-end mb-2">
              <span className="text-xs text-gray-400">{filledCount}/{initRestrictions.length} com análise</span>
            </div>
            <div className="space-y-2">
              {initRestrictions.map(r => {
                const isOpen = expandedId === r.id
                const hasRec = !!restrictionRecs[r.id]?.trim()
                return (
                  <div key={r.id} className={`border rounded-xl overflow-hidden ${hasRec ? "border-green-300 bg-green-50/30" : "border-gray-200 bg-white"}`}>
                    <button type="button" onClick={() => setExpandedId(isOpen ? null : r.id)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${hasRec ? "bg-green-500" : "bg-gray-300"}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{r.name}</span>
                            <span className="text-xs text-gray-400">{SOURCE_LABELS[r.sourceType] ?? r.sourceType}</span>
                          </div>
                          {r.notes && !isOpen && <p className="text-xs text-gray-500 mt-0.5 italic truncate">{r.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasRec && <span className="text-xs text-green-600 font-medium">✓ Preenchida</span>}
                        <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                        {r.notes && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium text-amber-700 mb-0.5">Observação de campo</p>
                            <p className="text-xs text-amber-900 italic">{r.notes}</p>
                          </div>
                        )}
                        <textarea autoFocus value={restrictionRecs[r.id] ?? ""}
                          onChange={e => setRestrictionRecs(prev => ({ ...prev, [r.id]: e.target.value }))}
                          rows={5} placeholder="Análise técnica e recomendação desta sobreposição…"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white" />
                        <div className="flex justify-between items-center">
                          <button type="button" onClick={() => { const i = initRestrictions.findIndex(x => x.id === r.id); if (i > 0) setExpandedId(initRestrictions[i-1].id) }}
                            disabled={initRestrictions.findIndex(x => x.id === r.id) === 0}
                            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">← Anterior</button>
                          <span className="text-xs text-gray-400">{initRestrictions.findIndex(x => x.id === r.id) + 1} / {initRestrictions.length}</span>
                          <button type="button" onClick={() => { const i = initRestrictions.findIndex(x => x.id === r.id); setExpandedId(i < initRestrictions.length - 1 ? initRestrictions[i+1].id : null) }}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">
                            {initRestrictions.findIndex(x => x.id === r.id) < initRestrictions.length - 1 ? "Próxima →" : "Concluir ✓"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── 6–8. Seções gerais ── */}
      {([
        ["Análise Geoespacial",         geoText,   setGeoText,  "Características gerais da área, histórico de uso, bases vetoriais analisadas…"],
        ["Análise de Vegetação",         vegText,   setVegText,  "Cobertura florestal, índices NDVI/EVI/SAVI, biomassa, espécies identificadas…"],
        ["Aspectos Legais e Ambientais", legalText, setLegal,    "Enquadramento no Código Florestal, CAR, APPs, Reserva Legal, vias de licenciamento…"],
      ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
        <div key={label}>
          <Divider label={label} />
          <textarea value={val} onChange={e => setter(e.target.value)} rows={4} placeholder={ph}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y mt-3" />
        </div>
      ))}

      {/* ── 9. Regularidade Fundiária ── */}
      <Divider label="Regularidade Fundiária" />
      <div className="space-y-2">
        {DOCUMENTS.map(doc => (
          <label key={doc.key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={documents[doc.key]} onChange={e => setDocuments(d => ({ ...d, [doc.key]: e.target.checked }))}
              className="w-4 h-4 accent-green-700 rounded" />
            <span className={`text-sm ${documents[doc.key] ? "text-green-800 line-through opacity-60" : "text-gray-700"}`}>{doc.label}</span>
          </label>
        ))}
      </div>

      {/* ── 10. Dados Quantitativos de Manejo ── */}
      <Divider label="Dados Quantitativos de Manejo" />
      <div className="grid grid-cols-2 gap-4">
        {([
          ["Ciclo de corte (anos)",                  cuttingCycle, setCuttingCycle, "35",        "number", "1"],
          ["Número de UPAs",                         numberOfUpas, setNumberOfUpas, "3",         "number", "1"],
          ["Área por UPA (ha)",                      areaPerUpa,   setAreaPerUpa,   "1.179,55",  "number", "0.0001"],
          ["Produtividade volumétrica anual (m³/ano)", annualVolume, setAnnualVolume, "32.425,46", "number", "0.01"],
        ] as [string, string, (v: string) => void, string, string, string][]).map(([label, val, setter, ph, type, step]) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input type={type} step={step} min="0" value={val} onChange={e => setter(e.target.value)} placeholder={ph}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        ))}
      </div>

      {/* Tabela de categorias */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Categorias de manejo</label>
        {categories.length > 0 && (
          <div className="border rounded-xl overflow-hidden mb-2">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>{["Categoria", "Área (ha)", "Int. Corte (m³/ha)", "Volume (m³)", ""].map(h =>
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {categories.map(cat => {
                  const vol = (parseFloat(cat.areaHa) || 0) * (parseFloat(cat.cuttingIntensity) || 0)
                  return (
                    <tr key={cat.id}>
                      <td className="px-3 py-1.5">
                        <input value={cat.category} onChange={e => updateCategory(cat.id, "category", e.target.value)}
                          placeholder="REMANESCENTE" className="w-full focus:outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.0001" value={cat.areaHa} onChange={e => updateCategory(cat.id, "areaHa", e.target.value)}
                          placeholder="0,00" className="w-24 focus:outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.01" value={cat.cuttingIntensity} onChange={e => updateCategory(cat.id, "cuttingIntensity", e.target.value)}
                          placeholder="30,00" className="w-24 focus:outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5 font-mono text-gray-600">{vol ? vol.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}</td>
                      <td className="px-3 py-1.5">
                        <button type="button" onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-600">×</button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 font-mono">{categories.reduce((s, c) => s + (parseFloat(c.areaHa) || 0), 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-mono">{categories.reduce((s, c) => s + (parseFloat(c.areaHa) || 0) * (parseFloat(c.cuttingIntensity) || 0), 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <button type="button" onClick={addCategory} className="text-sm text-green-700 hover:text-green-900 font-medium">+ Adicionar categoria</button>
      </div>

      {/* ── 11. Considerações Finais ── */}
      <Divider label="Considerações Finais" />
      <textarea value={conclusion} onChange={e => setConclusion(e.target.value)} rows={5}
        placeholder="Síntese das conclusões sobre viabilidade, potencial produtivo e condicionantes para o PMFS…"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" />

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Relatório salvo com sucesso.</p>}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-gray-400">
          {report.isPublished ? `Publicado ${report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("pt-BR") : ""}` : "Não publicado para o cliente"}
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
