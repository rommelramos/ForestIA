"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Analysis {
  id: number
  name: string | null
  notes: string | null
  sourceType: string | null
  geojson: string | null
}

interface GeoSource {
  id: number
  name: string
  organization: string | null
  thematicCategory: string | null
}

interface Project {
  id: number
  name: string
  municipality: string | null
  state: string | null
  areaHectares: string | null
  sicarCode: string | null
}

interface TeamRow  { id: string; name: string; role: string }
interface CatRow   { id: string; category: string; areaHa: string; cuttingIntensity: string }

interface Props {
  project: Project
  analyses: Analysis[]
  sources: GeoSource[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  "LANDSAT 5/7/8/9 (NASA)",
  "COPERNICUS / Sentinel-2A (ESA)",
  "RESOURCESAT (ISRO)",
  "MapBiomas",
  "PRODES (INPE)",
]

const DOCUMENTS = [
  { key: "titleDeed",                label: "Título de domínio / Certidão de autenticidade e localização" },
  { key: "registrationCertificate",  label: "Certidão de Matrícula atualizada" },
  { key: "georeferencing",           label: "Georreferenciamento" },
  { key: "sigefCertification",       label: "Certificação SIGEF/INCRA" },
  { key: "ccir",                     label: "Certificado de Cadastro de Imóvel Rural (CCIR)" },
] as const

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1985 + 1 }, (_, i) => String(1985 + i)).reverse()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function featureCount(geojson: string | null): number {
  if (!geojson) return 0
  try { return (JSON.parse(geojson) as { features?: unknown[] }).features?.length ?? 0 }
  catch { return 0 }
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

export function NewReportForm({ project, analyses, sources }: Props) {
  const router = useRouter()

  // 1. Basic
  const [title, setTitle] = useState(`Relatório de Viabilidade — ${project.name}`)

  // 2. Informações Gerais da Área
  const [carCode,          setCarCode]          = useState(project.sicarCode ?? "")
  const [licenseNumbers,   setLicenseNumbers]   = useState("")
  const [reserveLegalArea, setReserveLegalArea] = useState("")
  const [managementArea,   setManagementArea]   = useState("")

  // 3. Equipe Técnica
  const [team, setTeam] = useState<TeamRow[]>([{ id: uid(), name: "", role: "" }])

  // 4. Metodologia
  const [selectedSources,    setSelectedSources]    = useState<number[]>([])
  const [analysisStartYear,  setStartYear]           = useState("1995")
  const [analysisEndYear,    setEndYear]             = useState(String(CURRENT_YEAR))
  const [satellites,         setSatellites]          = useState<string[]>([])
  const [software,           setSoftware]            = useState("ArcGIS")

  // 5. Sobreposições
  const restrictions = analyses.map(a => ({
    id: a.id, name: a.name ?? "Sem nome", notes: a.notes ?? "",
    features: featureCount(a.geojson), sourceType: a.sourceType ?? "manual",
  }))
  const [expandedId,       setExpandedId]       = useState<number | null>(restrictions[0]?.id ?? null)
  const [recommendations,  setRecommendations]  = useState<Record<number, string>>({})

  // 6–8. Seções gerais
  const [geospatialAnalysis, setGeospatial] = useState("")
  const [vegetationAnalysis, setVegetation] = useState("")
  const [legalConsiderations, setLegal]     = useState("")

  // 9. Regularidade Fundiária
  const [documents, setDocuments] = useState({
    titleDeed: false, registrationCertificate: false,
    georeferencing: false, sigefCertification: false, ccir: false,
  })

  // 10. Dados Quantitativos de Manejo
  const [cuttingCycle,   setCuttingCycle]   = useState("35")
  const [numberOfUpas,   setNumberOfUpas]   = useState("")
  const [areaPerUpa,     setAreaPerUpa]     = useState("")
  const [annualVolume,   setAnnualVolume]   = useState("")
  const [categories,     setCategories]     = useState<CatRow[]>([])

  // 11. Considerações Finais
  const [conclusion, setConclusion] = useState("")

  // Status
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const filledCount = restrictions.filter(r => recommendations[r.id]?.trim()).length

  // ── Team helpers ──────────────────────────────────────────────────────────
  const addTeamMember   = () => setTeam(t => [...t, { id: uid(), name: "", role: "" }])
  const removeTeamMember = (id: string) => setTeam(t => t.filter(m => m.id !== id))
  const updateTeam = (id: string, field: "name" | "role", val: string) =>
    setTeam(t => t.map(m => m.id === id ? { ...m, [field]: val } : m))

  // ── Category helpers ──────────────────────────────────────────────────────
  const addCategory    = () => setCategories(c => [...c, { id: uid(), category: "", areaHa: "", cuttingIntensity: "" }])
  const removeCategory = (id: string) => setCategories(c => c.filter(r => r.id !== id))
  const updateCategory = (id: string, field: keyof CatRow, val: string) =>
    setCategories(c => c.map(r => r.id === id ? { ...r, [field]: val } : r))

  // ── Satellite toggle ──────────────────────────────────────────────────────
  const toggleSatellite = (s: string) =>
    setSatellites(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  // ── Source toggle ─────────────────────────────────────────────────────────
  const toggleSource = (id: number) =>
    setSelectedSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const content = {
        carCode: carCode.trim(),
        licenseNumbers: licenseNumbers.trim(),
        reserveLegalArea: reserveLegalArea ? parseFloat(reserveLegalArea) : null,
        managementArea: managementArea ? parseFloat(managementArea) : null,
        team: team.filter(m => m.name.trim()).map(({ id: _id, ...m }) => m),
        vectorSources: selectedSources,
        analysisStartYear: parseInt(analysisStartYear),
        analysisEndYear: parseInt(analysisEndYear),
        satellites,
        software: software.trim(),
        restrictions: restrictions.map(r => ({ ...r, recommendation: recommendations[r.id] ?? "" })),
        geospatialAnalysis,
        vegetationAnalysis,
        legalConsiderations,
        documents,
        cuttingCycle: cuttingCycle ? parseInt(cuttingCycle) : null,
        numberOfUpas: numberOfUpas ? parseInt(numberOfUpas) : null,
        areaPerUpa: areaPerUpa ? parseFloat(areaPerUpa) : null,
        annualVolumeProductivity: annualVolume ? parseFloat(annualVolume) : null,
        managementCategories: categories
          .filter(c => c.category.trim())
          .map(c => ({
            category: c.category,
            areaHa: parseFloat(c.areaHa) || 0,
            cuttingIntensity: parseFloat(c.cuttingIntensity) || 0,
            possibleVolume: (parseFloat(c.areaHa) || 0) * (parseFloat(c.cuttingIntensity) || 0),
          })),
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, title: title.trim(), content }),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Erro ao criar relatório"); return }
      const data = await res.json()
      if (conclusion.trim()) {
        await fetch(`/api/reports/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conclusion: conclusion.trim() }),
        })
      }
      router.push(`/dashboard/projects/${project.id}/report/${data.id}`)
    } catch { setError("Erro de conexão. Tente novamente.") }
    finally { setSubmitting(false) }
  }

  // ── Grouped sources for methodology ──────────────────────────────────────
  const groupedSources = sources.reduce<Record<string, GeoSource[]>>((acc, s) => {
    const cat = s.thematicCategory ?? "outros"
    ;(acc[cat] ??= []).push(s)
    return acc
  }, {})

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-16">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Novo Relatório de Viabilidade</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.name}
            {project.municipality && ` · ${project.municipality}${project.state ? `/${project.state}` : ""}`}
            {project.areaHectares && ` · ${Number(project.areaHectares).toLocaleString("pt-BR")} ha`}
          </p>
        </div>
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700 shrink-0">← Voltar</button>
      </div>

      {/* ── 1. Título ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
            <button type="button" onClick={() => removeTeamMember(m.id)}
              className="text-red-400 hover:text-red-600 px-2 text-lg leading-none">×</button>
          </div>
        ))}
        <button type="button" onClick={addTeamMember}
          className="text-sm text-green-700 hover:text-green-900 font-medium">+ Adicionar membro</button>
      </div>

      {/* ── 4. Metodologia ── */}
      <Divider label="Metodologia" />

      {/* Bases vetoriais */}
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
                  <input type="checkbox" checked={selectedSources.includes(s.id)} onChange={() => toggleSource(s.id)}
                    className="accent-green-700" />
                  <span className="text-sm text-gray-800">{s.name}</span>
                  {s.organization && <span className="text-xs text-gray-400 ml-auto shrink-0">{s.organization}</span>}
                </label>
              ))}
            </div>
          ))}
          {sources.length === 0 && (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">Nenhuma fonte cadastrada. Acesse o Catálogo de Bases Geoespaciais.</p>
          )}
        </div>
      </div>

      {/* Período + satélites + software */}
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
      <Divider label="Análise por Sobreposição" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">{restrictions.length} registro{restrictions.length !== 1 ? "s" : ""}</span>
          {restrictions.length > 0 && (
            <span className="text-xs text-gray-400">{filledCount}/{restrictions.length} com análise</span>
          )}
        </div>
        {restrictions.length === 0 ? (
          <div className="border border-dashed rounded-xl p-6 text-center text-sm text-gray-400">
            Nenhuma sobreposição salva. Acesse Análise Geoespacial para registrá-las.
          </div>
        ) : (
          <div className="space-y-2">
            {restrictions.map(r => {
              const isOpen = expandedId === r.id
              const hasRec = !!recommendations[r.id]?.trim()
              return (
                <div key={r.id} className={`border rounded-xl overflow-hidden ${hasRec ? "border-green-300 bg-green-50/30" : "border-gray-200 bg-white"}`}>
                  <button type="button" onClick={() => setExpandedId(isOpen ? null : r.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${hasRec ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Análise técnica e recomendação</label>
                        <textarea autoFocus value={recommendations[r.id] ?? ""}
                          onChange={e => setRecommendations(prev => ({ ...prev, [r.id]: e.target.value }))}
                          rows={5} placeholder={`Análise desta sobreposição e ações recomendadas…`}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white" />
                      </div>
                      <div className="flex justify-between items-center">
                        <button type="button" onClick={() => { const i = restrictions.findIndex(x => x.id === r.id); if (i > 0) setExpandedId(restrictions[i-1].id) }}
                          disabled={restrictions.findIndex(x => x.id === r.id) === 0}
                          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">← Anterior</button>
                        <span className="text-xs text-gray-400">{restrictions.findIndex(x => x.id === r.id) + 1} / {restrictions.length}</span>
                        <button type="button" onClick={() => { const i = restrictions.findIndex(x => x.id === r.id); setExpandedId(i < restrictions.length - 1 ? restrictions[i+1].id : null) }}
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

      {/* ── 6–8. Seções gerais ── */}
      {([
        ["Análise Geoespacial",        geospatialAnalysis, setGeospatial, "Características gerais da área, histórico de uso, bases vetoriais analisadas…"],
        ["Análise de Vegetação",        vegetationAnalysis, setVegetation, "Cobertura florestal, índices NDVI/EVI/SAVI, biomassa, espécies identificadas…"],
        ["Aspectos Legais e Ambientais",legalConsiderations, setLegal,    "Enquadramento no Código Florestal, CAR, APPs, Reserva Legal, vias de licenciamento…"],
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
          <label key={doc.key} className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={documents[doc.key]} onChange={e => setDocuments(d => ({ ...d, [doc.key]: e.target.checked }))}
              className="w-4 h-4 accent-green-700 rounded" />
            <span className={`text-sm ${documents[doc.key] ? "text-green-800 line-through opacity-60" : "text-gray-700"}`}>{doc.label}</span>
          </label>
        ))}
      </div>

      {/* ── 10. Dados Quantitativos de Manejo ── */}
      <Divider label="Dados Quantitativos de Manejo" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ciclo de corte (anos)</label>
          <input type="number" min="1" value={cuttingCycle} onChange={e => setCuttingCycle(e.target.value)} placeholder="35"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Número de UPAs</label>
          <input type="number" min="1" value={numberOfUpas} onChange={e => setNumberOfUpas(e.target.value)} placeholder="3"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Área por UPA (ha)</label>
          <input type="number" step="0.0001" min="0" value={areaPerUpa} onChange={e => setAreaPerUpa(e.target.value)} placeholder="1.179,55"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Produtividade volumétrica anual (m³/ano)</label>
          <input type="number" step="0.01" min="0" value={annualVolume} onChange={e => setAnnualVolume(e.target.value)} placeholder="32.425,46"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      {/* Tabela de categorias */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Categorias de manejo (por histórico de exploração)</label>
        {categories.length > 0 && (
          <div className="border rounded-xl overflow-hidden mb-2">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Categoria", "Área (ha)", "Int. Corte (m³/ha)", "Volume (m³)", ""].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map(c => {
                  const vol = (parseFloat(c.areaHa) || 0) * (parseFloat(c.cuttingIntensity) || 0)
                  return (
                    <tr key={c.id}>
                      <td className="px-3 py-1.5">
                        <input value={c.category} onChange={e => updateCategory(c.id, "category", e.target.value)}
                          placeholder="REMANESCENTE" className="w-full focus:outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.0001" value={c.areaHa} onChange={e => updateCategory(c.id, "areaHa", e.target.value)}
                          placeholder="0,00" className="w-24 focus:outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.01" value={c.cuttingIntensity} onChange={e => updateCategory(c.id, "cuttingIntensity", e.target.value)}
                          placeholder="30,00" className="w-24 focus:outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5 font-mono text-gray-600">{vol ? vol.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}</td>
                      <td className="px-3 py-1.5">
                        <button type="button" onClick={() => removeCategory(c.id)} className="text-red-400 hover:text-red-600">×</button>
                      </td>
                    </tr>
                  )
                })}
                {/* Totals */}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 font-mono">
                    {categories.reduce((s, c) => s + (parseFloat(c.areaHa) || 0), 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-mono">
                    {categories.reduce((s, c) => s + (parseFloat(c.areaHa) || 0) * (parseFloat(c.cuttingIntensity) || 0), 0)
                      .toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </td>
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
        placeholder="Síntese das conclusões sobre viabilidade, potencial produtivo e condicionantes para implementação do PMFS…"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" />

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-gray-400">
          {filledCount > 0 ? `${filledCount}/${restrictions.length} sobreposições analisadas` : ""}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={submitting || !title.trim()}
            className="px-6 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-40 font-medium">
            {submitting ? "Criando rascunho…" : "Criar Rascunho"}
          </button>
        </div>
      </div>
    </form>
  )
}
