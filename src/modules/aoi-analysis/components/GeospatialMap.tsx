"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"

// ── Types ─────────────────────────────────────────────────────────────────────

type LayerType = "aoi" | "restriction" | null

interface MapLayer {
  id: string
  name: string
  color: string
  geojson: GeoJSON.FeatureCollection
  visible: boolean
  source: "drawn" | "upload" | "sample"
  totalAreaHa: number
  layerType: LayerType
}

interface OverlapEntry {
  aoiFeat: string
  restrictFeat: string
  areaHa: number
  pctOfAoi: number
  pctOfRestriction: number
  intersection: GeoJSON.Feature
}

interface RestrictionResult {
  restrictionId: string
  restrictionName: string
  restrictionTotalHa: number
  entries: OverlapEntry[]
  totalOverlapHa: number
  pctOfAoiAffected: number          // % da área AOI coberta por ESTA restrição
}

interface AoiResult {
  aoiId: string
  aoiName: string
  aoiTotalHa: number
  restrictions: RestrictionResult[]
  totalAffectedHa: number            // união de todas as intersecções (sem dupla contagem)
  pctTotalAffected: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_LAYERS = {
  osm:       { label: "OpenStreetMap",     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                                               attr: "© OpenStreetMap contributors" },
  satellite: { label: "Satélite (ESRI)",   url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",                   attr: "Tiles © Esri" },
  topo:      { label: "Topográfico",       url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",                  attr: "Tiles © Esri" },
  relief:    { label: "Relevo (OpenTopo)", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",                                                                 attr: "© OpenTopoMap" },
} as const
type BaseKey = keyof typeof BASE_LAYERS

const AOI_COLORS         = ["#2563eb","#0891b2","#7c3aed","#0f766e","#1d4ed8"]
const RESTRICTION_COLORS = ["#dc2626","#ea580c","#db2777","#b45309","#9333ea"]

function nextColor(layers: MapLayer[], type: LayerType): string {
  const pool = type === "restriction" ? RESTRICTION_COLORS : AOI_COLORS
  const used = layers.filter(l => l.layerType === type).length
  return pool[used % pool.length]
}

async function calcAreaHa(geojson: GeoJSON.FeatureCollection): Promise<number> {
  const turf = await import("@turf/turf")
  return geojson.features.reduce((s, f) => {
    try { return f.geometry ? s + turf.area(f) / 10000 : s } catch { return s }
  }, 0)
}

function downloadGeoJSON(fc: GeoJSON.FeatureCollection, filename: string) {
  const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/json" })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeospatialMap({ projectId, onSaved }: { projectId?: number; onSaved?: () => void }) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<import("leaflet").Map | null>(null)
  const baseTileRef    = useRef<import("leaflet").TileLayer | null>(null)
  const drawnGroupRef  = useRef<import("leaflet").FeatureGroup | null>(null)
  const layerMapRef    = useRef<Map<string, import("leaflet").GeoJSON>>(new Map())
  const interGroupRef  = useRef<import("leaflet").FeatureGroup | null>(null)
  const drawCtrlObj    = useRef<{ ctrl: unknown }>({ ctrl: null })

  const [layers,     setLayers]     = useState<MapLayer[]>([])
  const [activeBase, setActiveBase] = useState<BaseKey>("osm")
  const [drawing,    setDrawing]    = useState(false)
  const [results,    setResults]    = useState<AoiResult[]>([])
  const [computing,  setComputing]  = useState(false)
  const [modal,      setModal]      = useState<{ open: boolean; geojson?: GeoJSON.Feature }>({ open: false })
  const [labelInput, setLabelInput] = useState("")
  const [newLayerType, setNewLayerType] = useState<LayerType>("aoi")
  const [saving,     setSaving]     = useState(false)
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; aoiResult?: AoiResult; name: string; notes: string }>({ open: false, name: "", notes: "" })
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    Promise.all([import("leaflet"), import("leaflet-draw")]).then(([L]) => {
      if (destroyed || !containerRef.current) return

      const proto = L.Icon.Default.prototype as unknown as Record<string, unknown>
      delete proto._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      const map   = L.map(containerRef.current!, { center: [-2.52, -54.76], zoom: 10 })
      const tile  = L.tileLayer(BASE_LAYERS.osm.url, { attribution: BASE_LAYERS.osm.attr, maxZoom: 19 })
      tile.addTo(map)
      baseTileRef.current = tile

      const drawn = new L.FeatureGroup().addTo(map)
      drawnGroupRef.current = drawn

      const interGroup = new L.FeatureGroup().addTo(map)
      interGroupRef.current = interGroup

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DrawControl = (L as any).Control?.Draw
      if (DrawControl) {
        drawCtrlObj.current.ctrl = new DrawControl({
          draw: { polygon: { shapeOptions: { color: "#2563eb" } }, polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false },
          edit: { featureGroup: drawn },
        })
      }

      map.on("draw:created", (e: unknown) => {
        const ev = e as { layer: import("leaflet").Layer & { toGeoJSON: () => GeoJSON.Feature } }
        drawn.addLayer(ev.layer)
        setModal({ open: true, geojson: ev.layer.toGeoJSON() })
      })

      mapRef.current = map
    })

    return () => { destroyed = true; mapRef.current?.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Switch base layer ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    import("leaflet").then((L) => {
      baseTileRef.current?.remove()
      const cfg  = BASE_LAYERS[activeBase]
      const tile = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: 19 })
      tile.addTo(map)
      baseTileRef.current = tile
    })
  }, [activeBase])

  // ── Sync layers to map ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    import("leaflet").then((L) => {
      layers.forEach((layer) => {
        const existing = layerMapRef.current.get(layer.id)
        if (existing) {
          layer.visible ? map.addLayer(existing) : map.removeLayer(existing)
          return
        }
        if (!layer.visible) return
        const gl = L.geoJSON(layer.geojson, {
          style: { color: layer.color, weight: layer.layerType === "restriction" ? 2 : 2.5,
                   fillOpacity: layer.layerType === "restriction" ? 0.15 : 0.2,
                   dashArray: layer.layerType === "restriction" ? "6 3" : undefined },
          onEachFeature: (f, lyr) => {
            const p = f.properties ?? {}
            const name = String(p.nome ?? p.name ?? p.id ?? "Feature")
            const rows = Object.entries(p).filter(([k]) => !["nome","name"].includes(k))
              .map(([k,v]) => `<tr><td class="pr-2 text-gray-400">${k}</td><td>${v}</td></tr>`).join("")
            lyr.bindPopup(`<strong>${name}</strong>${rows ? `<table class="mt-1 text-xs">${rows}</table>` : ""}`)
          },
        })
        gl.addTo(map)
        layerMapRef.current.set(layer.id, gl)
      })
      layerMapRef.current.forEach((gl, id) => {
        if (!layers.find(l => l.id === id)) { map.removeLayer(gl); layerMapRef.current.delete(id) }
      })
    })
  }, [layers])

  // ── Toggle draw ─────────────────────────────────────────────────────────────
  const toggleDraw = useCallback(() => {
    const map  = mapRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = drawCtrlObj.current.ctrl as any
    if (!map || !ctrl) return
    if (!drawing) { map.addControl(ctrl); setDrawing(true) }
    else          { map.removeControl(ctrl); setDrawing(false) }
  }, [drawing])

  // ── Save drawn polygon ──────────────────────────────────────────────────────
  const saveDrawn = useCallback(async () => {
    if (!modal.geojson || !labelInput.trim()) return
    const feature = { ...modal.geojson, properties: { nome: labelInput, tipo: newLayerType === "aoi" ? "Área Alvo" : "Restrição" } }
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [feature] }
    const areaHa = +(await calcAreaHa(fc)).toFixed(2)
    const color  = nextColor(layers, newLayerType)
    setLayers(p => [...p, { id: uuidv4(), name: labelInput, color, geojson: fc, visible: true, source: "drawn", totalAreaHa: areaHa, layerType: newLayerType }])
    drawnGroupRef.current?.clearLayers()
    setModal({ open: false }); setLabelInput("")
  }, [modal, labelInput, layers, newLayerType])

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: LayerType) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    let geojson: GeoJSON.FeatureCollection | null = null
    try {
      if (file.name.match(/\.(geojson|json)$/i)) {
        geojson = JSON.parse(await file.text())
      } else if (file.name.match(/\.(zip|shp)$/i)) {
        const shp = (await import("shpjs")).default
        const r   = await shp(await file.arrayBuffer())
        geojson   = Array.isArray(r) ? r[0] : r
      } else { alert("Formato não suportado. Use .geojson, .json ou .zip"); return }
    } catch { alert("Erro ao ler o arquivo."); return }
    if (!geojson) return

    const areaHa = +(await calcAreaHa(geojson)).toFixed(2)
    const color  = nextColor(layers, type)
    const name   = file.name.replace(/\.(geojson|json|zip|shp)$/i, "")
    setLayers(p => [...p, { id: uuidv4(), name, color, geojson, visible: true, source: "upload", totalAreaHa: areaHa, layerType: type }])
  }, [layers])

  // ── Load sample ─────────────────────────────────────────────────────────────
  const loadSample = useCallback(async (filename: string, label: string, type: LayerType) => {
    const geojson: GeoJSON.FeatureCollection = await (await fetch(`/samples/${filename}`)).json()
    const areaHa = +(await calcAreaHa(geojson)).toFixed(2)
    const color  = nextColor(layers, type)
    setLayers(p => [...p, { id: uuidv4(), name: label, color, geojson, visible: true, source: "sample", totalAreaHa: areaHa, layerType: type }])
  }, [layers])

  // ── Zoom to layer ───────────────────────────────────────────────────────────
  const zoomTo = useCallback((id: string) => {
    const gl  = layerMapRef.current.get(id)
    const map = mapRef.current
    if (!gl || !map) return
    try { map.fitBounds(gl.getBounds(), { padding: [40, 40] }) } catch { /* empty */ }
  }, [])

  // ── Remove layer ────────────────────────────────────────────────────────────
  const removeLayer = useCallback((id: string) => {
    const gl = layerMapRef.current.get(id)
    if (gl && mapRef.current) mapRef.current.removeLayer(gl)
    layerMapRef.current.delete(id)
    setLayers(p => p.filter(l => l.id !== id))
  }, [])

  // ── Set layer type ──────────────────────────────────────────────────────────
  const setLayerType = useCallback((id: string, type: LayerType) => {
    setLayers(p => p.map(l => {
      if (l.id !== id) return l
      const color = nextColor(p.filter(x => x.id !== id), type)
      // Update map style
      const gl = layerMapRef.current.get(id)
      if (gl) gl.setStyle({ color, dashArray: type === "restriction" ? "6 3" : undefined })
      return { ...l, layerType: type, color }
    }))
  }, [])

  // ── Compute ALL overlaps (AOI × restriction) ────────────────────────────────
  const computeAllOverlaps = useCallback(async () => {
    const aoiLayers  = layers.filter(l => l.layerType === "aoi")
    const restLayers = layers.filter(l => l.layerType === "restriction")
    if (!aoiLayers.length || !restLayers.length) return

    // Clear previous intersection overlays
    interGroupRef.current?.clearLayers()
    setComputing(true)

    try {
      const turf  = await import("@turf/turf")
      const L     = await import("leaflet")
      const aoiResults: AoiResult[] = []

      for (const aoi of aoiLayers) {
        const aoiTotalHa = aoi.totalAreaHa
        const restrictionResults: RestrictionResult[] = []
        const allIntersections: GeoJSON.Feature[] = []

        for (const rest of restLayers) {
          const entries: OverlapEntry[] = []

          for (const f1 of aoi.geojson.features) {
            for (const f2 of rest.geojson.features) {
              if (!f1.geometry || !f2.geometry) continue
              if (!["Polygon","MultiPolygon"].includes(f1.geometry.type)) continue
              if (!["Polygon","MultiPolygon"].includes(f2.geometry.type)) continue
              try {
                const inter = turf.intersect(turf.featureCollection([
                  f1 as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
                  f2 as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
                ]))
                if (!inter) continue
                const areaM2 = turf.area(inter)
                if (areaM2 < 1) continue

                const f1M2 = turf.area(f1), f2M2 = turf.area(f2)
                const enriched: GeoJSON.Feature = {
                  ...inter,
                  properties: {
                    aoi_layer:         aoi.name,
                    aoi_feature:       String(f1.properties?.nome ?? f1.properties?.name ?? "feat"),
                    restriction_layer: rest.name,
                    restriction_feature: String(f2.properties?.nome ?? f2.properties?.name ?? "feat"),
                    area_ha:           +(areaM2 / 10000).toFixed(4),
                    pct_of_aoi:        +(f1M2 > 0 ? (areaM2 / f1M2) * 100 : 0).toFixed(2),
                    pct_of_restriction: +(f2M2 > 0 ? (areaM2 / f2M2) * 100 : 0).toFixed(2),
                  },
                }
                entries.push({
                  aoiFeat: String(f1.properties?.nome ?? f1.properties?.name ?? "feat"),
                  restrictFeat: String(f2.properties?.nome ?? f2.properties?.name ?? "feat"),
                  areaHa: +(areaM2 / 10000).toFixed(2),
                  pctOfAoi: +(f1M2 > 0 ? (areaM2 / f1M2) * 100 : 0).toFixed(1),
                  pctOfRestriction: +(f2M2 > 0 ? (areaM2 / f2M2) * 100 : 0).toFixed(1),
                  intersection: enriched,
                })
                allIntersections.push(enriched)

                // Render on map
                const il = L.geoJSON(enriched, {
                  style: { color: rest.color, weight: 1.5, fillColor: rest.color, fillOpacity: 0.6 },
                })
                il.bindPopup(`<strong>Sobreposição</strong><br/>${aoi.name} × ${rest.name}<br/>${+(areaM2/10000).toFixed(2)} ha`)
                interGroupRef.current?.addLayer(il)
              } catch { /* skip invalid geometries */ }
            }
          }

          if (entries.length > 0) {
            const totalOverlapHa = +(entries.reduce((s, e) => s + e.areaHa, 0)).toFixed(2)
            restrictionResults.push({
              restrictionId:       rest.id,
              restrictionName:     rest.name,
              restrictionTotalHa:  rest.totalAreaHa,
              entries,
              totalOverlapHa,
              pctOfAoiAffected:    +(aoiTotalHa > 0 ? (totalOverlapHa / aoiTotalHa) * 100 : 0).toFixed(1),
            })
          }
        }

        // Total affected (best effort — may double-count overlapping restrictions)
        const totalAffected = +(restrictionResults.reduce((s, r) => s + r.totalOverlapHa, 0)).toFixed(2)
        aoiResults.push({
          aoiId:              aoi.id,
          aoiName:            aoi.name,
          aoiTotalHa,
          restrictions:       restrictionResults,
          totalAffectedHa:    totalAffected,
          pctTotalAffected:   +(aoiTotalHa > 0 ? (totalAffected / aoiTotalHa) * 100 : 0).toFixed(1),
        })
      }

      setResults(aoiResults)
    } finally { setComputing(false) }
  }, [layers])

  // ── Clear overlaps ──────────────────────────────────────────────────────────
  const clearOverlaps = useCallback(() => {
    interGroupRef.current?.clearLayers()
    setResults([])
  }, [])

  // ── Export helpers ──────────────────────────────────────────────────────────
  const exportIntersections = useCallback((aoiResult: AoiResult, restResult?: RestrictionResult) => {
    const entries = restResult ? restResult.entries : aoiResult.restrictions.flatMap(r => r.entries)
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: entries.map(e => e.intersection) }
    const name = restResult
      ? `sobreposicao_${aoiResult.aoiName}_${restResult.restrictionName}`
      : `sobreposicao_${aoiResult.aoiName}_todas`
    downloadGeoJSON(fc, `${name.replace(/\s+/g,"_")}.geojson`)
  }, [])

  const exportRestrictionsWithOverlap = useCallback((aoiResult: AoiResult, restResult?: RestrictionResult) => {
    const targets = restResult ? [restResult] : aoiResult.restrictions
    const feats: GeoJSON.Feature[] = []
    for (const r of targets) {
      const restLayer = layers.find(l => l.id === r.restrictionId)
      if (!restLayer) continue
      const names = new Set(r.entries.map(e => e.restrictFeat))
      const filtered = restLayer.geojson.features.filter(f =>
        names.has(String(f.properties?.nome ?? f.properties?.name ?? "feat"))
      )
      feats.push(...filtered.map(f => ({ ...f, properties: { ...f.properties, overlaps_with: aoiResult.aoiName, overlap_ha: r.totalOverlapHa } })))
    }
    downloadGeoJSON({ type: "FeatureCollection", features: feats },
      `restricoes_sobrepostas_${aoiResult.aoiName.replace(/\s+/g,"_")}.geojson`)
  }, [layers])

  // ── Save to project ─────────────────────────────────────────────────────────
  const saveToProject = useCallback((aoiResult: AoiResult) => {
    if (!projectId) { alert("Abra esta análise a partir de um projeto para salvar."); return }
    setSaveDialog({ open: true, aoiResult, name: `Sobreposição – ${aoiResult.aoiName}`, notes: "" })
  }, [projectId])

  const confirmSave = useCallback(async () => {
    if (!saveDialog.aoiResult || !projectId) return
    setSaving(true)
    try {
      const aoiResult = saveDialog.aoiResult
      const allIntersections = aoiResult.restrictions.flatMap(r => r.entries.map(e => e.intersection))
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: allIntersections }
      const res = await fetch("/api/aoi-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: saveDialog.name.trim() || `Sobreposição – ${aoiResult.aoiName}`,
          notes: saveDialog.notes.trim() || undefined,
          geojson: JSON.stringify(fc),
          sourceType: "manual",
        }),
      })
      if (res.ok) {
        setSaveDialog({ open: false, name: "", notes: "" })
        onSaved?.()
        alert("Análise salva com sucesso!")
      } else {
        alert("Erro ao salvar. Tente novamente.")
      }
    } finally { setSaving(false) }
  }, [saveDialog, projectId])

  // ── Derived state ───────────────────────────────────────────────────────────
  const aoiLayers   = layers.filter(l => l.layerType === "aoi")
  const restLayers  = layers.filter(l => l.layerType === "restriction")
  const unsetLayers = layers.filter(l => !l.layerType)
  const canCompute  = aoiLayers.length > 0 && restLayers.length > 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0">

      {/* ── Left panel ── */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r overflow-y-auto text-sm">

        {/* Base layers */}
        <section className="p-3 border-b">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camada base</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(BASE_LAYERS) as BaseKey[]).map(k => (
              <button key={k} onClick={() => setActiveBase(k)}
                className={`text-xs px-2 py-1.5 rounded border transition-colors ${activeBase===k ? "bg-green-600 text-white border-green-600" : "border-gray-200 hover:border-green-400"}`}>
                {BASE_LAYERS[k].label}
              </button>
            ))}
          </div>
        </section>

        {/* Add layers */}
        <section className="p-3 border-b space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Adicionar camada</p>

          {/* Draw */}
          <div className="flex gap-1 items-center">
            <button onClick={toggleDraw}
              className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${drawing ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:border-blue-400"}`}>
              {drawing ? "✏️ Desenhando…" : "✏️ Desenhar polígono"}
            </button>
          </div>

          {/* Upload AOI */}
          <button onClick={() => { setNewLayerType("aoi"); document.getElementById("file-aoi")?.click() }}
            className="w-full text-xs px-2 py-1.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 text-left transition-colors">
            📂 Carregar Área Alvo (AOI)
          </button>
          <input id="file-aoi" type="file" accept=".geojson,.json,.zip,.shp" className="hidden" onChange={e => handleFile(e, "aoi")} />

          {/* Upload restriction */}
          <button onClick={() => document.getElementById("file-rest")?.click()}
            className="w-full text-xs px-2 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 text-left transition-colors">
            🚫 Carregar Restrição
          </button>
          <input id="file-rest" type="file" accept=".geojson,.json,.zip,.shp" className="hidden" onChange={e => handleFile(e, "restriction")} />
        </section>

        {/* Samples */}
        <section className="p-3 border-b space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Exemplos</p>
          <button onClick={() => loadSample("floresta-exemplo.geojson", "Floresta Exemplo", "aoi")}
            className="w-full text-xs px-2 py-1.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 text-left">
            🌲 Floresta (AOI)
          </button>
          <button onClick={() => loadSample("restricoes-exemplo.geojson", "Restrições Exemplo", "restriction")}
            className="w-full text-xs px-2 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 text-left">
            🚫 Restrições
          </button>
        </section>

        {/* Layer list */}
        <section className="p-3 flex-1 min-h-0 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camadas ({layers.length})</p>
          {layers.length === 0 && <p className="text-xs text-gray-400">Nenhuma camada.</p>}

          {/* Grouped by type */}
          {[
            { type: "aoi" as LayerType, label: "🔵 Áreas Alvo (AOI)", list: aoiLayers },
            { type: "restriction" as LayerType, label: "🔴 Restrições", list: restLayers },
            { type: null, label: "⚪ Sem classificação", list: unsetLayers },
          ].filter(g => g.list.length > 0).map(group => (
            <div key={String(group.type)} className="mb-3">
              <p className="text-xs text-gray-400 mb-1">{group.label}</p>
              <div className="space-y-1.5">
                {group.list.map(layer => (
                  <LayerRow key={layer.id} layer={layer}
                    onToggleVisible={v => setLayers(p => p.map(l => l.id===layer.id ? {...l, visible: v} : l))}
                    onZoom={() => zoomTo(layer.id)}
                    onExport={() => downloadGeoJSON(layer.geojson, `${layer.name.replace(/\s+/g,"_")}.geojson`)}
                    onRemove={() => removeLayer(layer.id)}
                    onSetType={t => setLayerType(layer.id, t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Overlap trigger */}
        <section className="p-3 border-t">
          {!canCompute && (
            <p className="text-xs text-gray-400 text-center">
              Adicione ao menos 1 camada AOI 🔵 e 1 restrição 🔴 para analisar sobreposição.
            </p>
          )}
          {canCompute && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">
                <strong>{aoiLayers.length}</strong> AOI × <strong>{restLayers.length}</strong> restrição(ões) =&nbsp;
                <strong>{aoiLayers.length * restLayers.length}</strong> arranjo(s)
              </p>
              <button onClick={computeAllOverlaps} disabled={computing}
                className="w-full text-xs px-3 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 font-medium transition-colors">
                {computing ? "Calculando…" : "🔍 Calcular todas as sobreposições"}
              </button>
              {results.length > 0 && (
                <button onClick={clearOverlaps} className="w-full text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                  Limpar resultados
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Map + Results ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={containerRef} className="flex-1 min-h-0" />

        {/* Results panel */}
        {results.length > 0 && (
          <div className="border-t bg-white overflow-y-auto" style={{ maxHeight: "45%" }}>
            <div className="px-4 pt-3 pb-1 flex items-center justify-between border-b">
              <h3 className="font-semibold text-sm">Resultados de sobreposição</h3>
              <button onClick={clearOverlaps} className="text-xs text-gray-400 hover:text-gray-600">✕ Fechar</button>
            </div>

            {results.map(aoi => (
              <div key={aoi.aoiId} className="border-b last:border-0">
                {/* AOI header */}
                <div className="px-4 py-2.5 bg-blue-50 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-semibold text-sm text-blue-900">🔵 {aoi.aoiName}</span>
                    <span className="text-xs text-blue-600 ml-2">{aoi.aoiTotalHa.toLocaleString("pt-BR")} ha total</span>
                    {aoi.restrictions.length > 0 && (
                      <span className={`ml-2 text-xs font-bold ${aoi.pctTotalAffected > 50 ? "text-red-600" : aoi.pctTotalAffected > 20 ? "text-yellow-600" : "text-green-700"}`}>
                        ⚠️ {aoi.totalAffectedHa} ha afetado ({aoi.pctTotalAffected}%)
                      </span>
                    )}
                    {aoi.restrictions.length === 0 && <span className="ml-2 text-xs text-green-700 font-medium">✓ Sem sobreposições</span>}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {aoi.restrictions.length > 0 && (
                      <>
                        <button onClick={() => exportIntersections(aoi)}
                          className="text-xs px-2 py-1 rounded border border-orange-300 text-orange-700 hover:bg-orange-50 transition-colors">
                          ↓ Intersecções
                        </button>
                        <button onClick={() => exportRestrictionsWithOverlap(aoi)}
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors">
                          ↓ Restrições sobrepostas
                        </button>
                        <button onClick={() => saveToProject(aoi)} disabled={saving || !projectId}
                          className="text-xs px-2 py-1 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors"
                          title={!projectId ? "Abra a partir de um projeto" : ""}>
                          {saving ? "…" : "💾 Salvar"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Per-restriction results */}
                {aoi.restrictions.map(rest => (
                  <div key={rest.restrictionId} className="px-4 pb-3 pt-2">
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-red-700">🔴 {rest.restrictionName}</span>
                        <span className="text-gray-400">{rest.restrictionTotalHa.toLocaleString("pt-BR")} ha total</span>
                        <span className={`font-bold ${rest.pctOfAoiAffected > 50 ? "text-red-600" : rest.pctOfAoiAffected > 20 ? "text-yellow-600" : "text-green-700"}`}>
                          {rest.totalOverlapHa} ha / {rest.pctOfAoiAffected}% da AOI
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => exportIntersections(aoi, rest)}
                          className="text-xs px-1.5 py-0.5 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors">
                          ↓ Geo intersecção
                        </button>
                        <button onClick={() => exportRestrictionsWithOverlap(aoi, rest)}
                          className="text-xs px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                          ↓ Geo restrição
                        </button>
                      </div>
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-1.5 border">Feição AOI</th>
                          <th className="text-left p-1.5 border">Feição restrição</th>
                          <th className="text-right p-1.5 border">Área (ha)</th>
                          <th className="text-right p-1.5 border">% da AOI</th>
                          <th className="text-right p-1.5 border">% da restrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.entries.map((e, i) => (
                          <tr key={i} className={e.pctOfAoi > 50 ? "bg-red-50" : e.pctOfAoi > 20 ? "bg-yellow-50" : ""}>
                            <td className="p-1.5 border">{e.aoiFeat}</td>
                            <td className="p-1.5 border">{e.restrictFeat}</td>
                            <td className="p-1.5 border text-right font-mono">{e.areaHa}</td>
                            <td className={`p-1.5 border text-right font-mono font-bold ${e.pctOfAoi>50?"text-red-600":e.pctOfAoi>20?"text-yellow-600":"text-green-700"}`}>{e.pctOfAoi}%</td>
                            <td className="p-1.5 border text-right font-mono text-gray-500">{e.pctOfRestriction}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save overlap modal */}
      {saveDialog.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
            <h3 className="font-semibold text-gray-900">💾 Salvar sobreposição</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome da análise</label>
              <input
                autoFocus
                value={saveDialog.name}
                onChange={e => setSaveDialog(s => ({ ...s, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && confirmSave()}
                placeholder="Ex: Sobreposição APP – Fazenda Boa Vista"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
              <textarea
                value={saveDialog.notes}
                onChange={e => setSaveDialog(s => ({ ...s, notes: e.target.value }))}
                placeholder="Anotações sobre esta sobreposição…"
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveDialog({ open: false, name: "", notes: "" })}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmSave}
                disabled={saving || !saveDialog.name.trim()}
                className="px-4 py-1.5 text-sm bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-40">
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save drawn modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold">Salvar polígono desenhado</h3>
            <input autoFocus value={labelInput} onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveDrawn()}
              placeholder="Nome do polígono…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Tipo de camada</p>
              <div className="flex gap-2">
                <button onClick={() => setNewLayerType("aoi")}
                  className={`flex-1 text-xs py-1.5 rounded border transition-colors ${newLayerType==="aoi" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:border-blue-400"}`}>
                  🔵 Área Alvo (AOI)
                </button>
                <button onClick={() => setNewLayerType("restriction")}
                  className={`flex-1 text-xs py-1.5 rounded border transition-colors ${newLayerType==="restriction" ? "bg-red-600 text-white border-red-600" : "border-gray-200 hover:border-red-400"}`}>
                  🔴 Restrição
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal({ open: false }); drawnGroupRef.current?.clearLayers(); setLabelInput("") }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Cancelar</button>
              <button onClick={saveDrawn} disabled={!labelInput.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LayerRow sub-component ────────────────────────────────────────────────────

function LayerRow({ layer, onToggleVisible, onZoom, onExport, onRemove, onSetType }: {
  layer: MapLayer
  onToggleVisible: (v: boolean) => void
  onZoom: () => void
  onExport: () => void
  onRemove: () => void
  onSetType: (t: LayerType) => void
}) {
  return (
    <div className="rounded border border-gray-100 p-2 group bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-1.5">
        <input type="checkbox" checked={layer.visible} className="rounded flex-shrink-0"
          onChange={e => onToggleVisible(e.target.checked)} />
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: layer.color,
          border: layer.layerType === "restriction" ? "1px dashed rgba(0,0,0,0.3)" : "none" }} />
        <span className="flex-1 truncate text-xs font-medium" title={layer.name}>{layer.name}</span>
        <button title="Ir para localização" onClick={onZoom}
          className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity">🎯</button>
        <button title="Exportar GeoJSON" onClick={onExport}
          className="opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-800 transition-opacity text-xs font-bold">↓</button>
        <button title="Remover" onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity text-xs">✕</button>
      </div>
      <div className="flex gap-1 mt-1.5 pl-5">
        <button onClick={() => onSetType("aoi")}
          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${layer.layerType==="aoi" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500 hover:border-blue-300"}`}>
          AOI
        </button>
        <button onClick={() => onSetType("restriction")}
          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${layer.layerType==="restriction" ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-500 hover:border-red-300"}`}>
          Restrição
        </button>
        <span className="ml-auto text-xs text-gray-400 self-center">
          {layer.totalAreaHa.toLocaleString("pt-BR")} ha
        </span>
      </div>
    </div>
  )
}
