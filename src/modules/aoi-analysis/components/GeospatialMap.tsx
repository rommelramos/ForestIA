"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"

interface MapLayer {
  id: string
  name: string
  color: string
  geojson: GeoJSON.FeatureCollection
  visible: boolean
  source: "drawn" | "upload" | "sample"
}

interface OverlapResult {
  layer1: string
  layer2: string
  pairs: { feat1: string; feat2: string; areaHa: number; pct: number }[]
  totalHa: number
}

const BASE_LAYERS = {
  osm:       { label: "OpenStreetMap",    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                                                    attr: "© OpenStreetMap contributors" },
  satellite: { label: "Satélite (ESRI)",  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",                        attr: "Tiles © Esri" },
  topo:      { label: "Topográfico",      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",                       attr: "Tiles © Esri" },
  relief:    { label: "Relevo (OpenTopo)",url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",                                                                      attr: "© OpenTopoMap contributors" },
} as const
type BaseKey = keyof typeof BASE_LAYERS

const LAYER_COLORS = ["#2563eb","#16a34a","#dc2626","#9333ea","#ea580c","#0891b2","#65a30d","#db2777"]

export function GeospatialMap({ projectId }: { projectId?: number }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<import("leaflet").Map | null>(null)
  const baseTileRef   = useRef<import("leaflet").TileLayer | null>(null)
  const drawnGroupRef = useRef<import("leaflet").FeatureGroup | null>(null)
  const layerMapRef   = useRef<Map<string, import("leaflet").GeoJSON>>(new Map())

  const [layers,      setLayers]      = useState<MapLayer[]>([])
  const [activeBase,  setActiveBase]  = useState<BaseKey>("osm")
  const [drawing,     setDrawing]     = useState(false)
  const [drawCtrlRef] = useState<{ ctrl: unknown }>({ ctrl: null })
  const [overlap,     setOverlap]     = useState<OverlapResult | null>(null)
  const [sel,         setSel]         = useState<[string?, string?]>([])
  const [modal,       setModal]       = useState<{ open: boolean; geojson?: GeoJSON.Feature }>({ open: false })
  const [labelInput,  setLabelInput]  = useState("")
  const [computing,   setComputing]   = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    Promise.all([import("leaflet"), import("leaflet-draw")]).then(([L]) => {
      if (destroyed || !containerRef.current) return

      // Fix default marker icons
      const iconProto = L.Icon.Default.prototype as unknown as Record<string, unknown>
      delete iconProto._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      const map = L.map(containerRef.current!, { center: [-2.52, -54.76], zoom: 10 })

      const tile = L.tileLayer(BASE_LAYERS.osm.url, { attribution: BASE_LAYERS.osm.attr, maxZoom: 19 })
      tile.addTo(map)
      baseTileRef.current = tile

      const drawn = new L.FeatureGroup()
      drawn.addTo(map)
      drawnGroupRef.current = drawn

      // Draw control
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DrawControl = (L as any).Control?.Draw
      if (DrawControl) {
        const ctrl = new DrawControl({
          draw: { polygon: { shapeOptions: { color: "#2563eb" } }, polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false },
          edit: { featureGroup: drawn },
        })
        drawCtrlRef.ctrl = ctrl
      }

      map.on("draw:created", (e: unknown) => {
        const ev = e as { layer: import("leaflet").Layer & { toGeoJSON: () => GeoJSON.Feature } }
        const feature = ev.layer.toGeoJSON()
        drawn.addLayer(ev.layer)
        setModal({ open: true, geojson: feature })
      })

      mapRef.current = map
    })

    return () => {
      destroyed = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Switch base layer ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    import("leaflet").then((L) => {
      baseTileRef.current?.remove()
      const cfg = BASE_LAYERS[activeBase]
      const tile = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: 19 })
      tile.addTo(map)
      baseTileRef.current = tile
    })
  }, [activeBase])

  // ── Sync layers to map ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    import("leaflet").then((L) => {
      layers.forEach((layer) => {
        const existing = layerMapRef.current.get(layer.id)
        if (existing) {
          if (layer.visible) map.addLayer(existing)
          else map.removeLayer(existing)
          return
        }
        if (!layer.visible) return
        const gl = L.geoJSON(layer.geojson, {
          style: { color: layer.color, weight: 2, fillOpacity: 0.25 },
          onEachFeature: (f, lyr) => {
            const props = f.properties ?? {}
            const label = props.nome ?? props.name ?? props.id ?? "Feature"
            lyr.bindPopup(`<strong>${label}</strong><br/>${Object.entries(props).filter(([k]) => k !== "nome" && k !== "name").map(([k,v]) => `${k}: ${v}`).join("<br/>")}`)
          },
        })
        gl.addTo(map)
        layerMapRef.current.set(layer.id, gl)
      })

      // Remove deleted layers
      layerMapRef.current.forEach((gl, id) => {
        if (!layers.find((l) => l.id === id)) {
          map.removeLayer(gl)
          layerMapRef.current.delete(id)
        }
      })
    })
  }, [layers])

  // ── Toggle draw mode ──────────────────────────────────────────────────────
  const toggleDraw = useCallback(() => {
    const map = mapRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = drawCtrlRef.ctrl as any
    if (!map || !ctrl) return
    if (!drawing) {
      map.addControl(ctrl)
      setDrawing(true)
    } else {
      map.removeControl(ctrl)
      setDrawing(false)
    }
  }, [drawing, drawCtrlRef])

  // ── Save drawn polygon ────────────────────────────────────────────────────
  const saveDrawn = useCallback(() => {
    if (!modal.geojson || !labelInput.trim()) return
    const feature = { ...modal.geojson, properties: { nome: labelInput, fonte: "Desenhado" } }
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [feature] }
    const color = LAYER_COLORS[layers.length % LAYER_COLORS.length]
    setLayers((prev) => [...prev, { id: uuidv4(), name: labelInput, color, geojson: fc, visible: true, source: "drawn" }])
    drawnGroupRef.current?.clearLayers()
    setModal({ open: false })
    setLabelInput("")
  }, [modal, labelInput, layers.length])

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    let geojson: GeoJSON.FeatureCollection | null = null

    try {
      if (file.name.endsWith(".geojson") || file.name.endsWith(".json")) {
        geojson = JSON.parse(await file.text())
      } else if (file.name.endsWith(".zip") || file.name.endsWith(".shp")) {
        const shp = (await import("shpjs")).default
        const buf = await file.arrayBuffer()
        const result = await shp(buf)
        geojson = Array.isArray(result) ? result[0] : result
      } else {
        alert("Formato não suportado. Use .geojson, .json ou .zip (shapefile).")
        return
      }
    } catch {
      alert("Erro ao ler o arquivo.")
      return
    }

    if (!geojson) return
    const color = LAYER_COLORS[layers.length % LAYER_COLORS.length]
    const name = file.name.replace(/\.(geojson|json|zip|shp)$/i, "")
    setLayers((prev) => [...prev, { id: uuidv4(), name, color, geojson, visible: true, source: "upload" }])
  }, [layers.length])

  // ── Load sample ───────────────────────────────────────────────────────────
  const loadSample = useCallback(async (filename: string, label: string) => {
    const res = await fetch(`/samples/${filename}`)
    const geojson: GeoJSON.FeatureCollection = await res.json()
    const color = LAYER_COLORS[layers.length % LAYER_COLORS.length]
    setLayers((prev) => [...prev, { id: uuidv4(), name: label, color, geojson, visible: true, source: "sample" }])
  }, [layers.length])

  // ── Overlap analysis ──────────────────────────────────────────────────────
  const computeOverlap = useCallback(async () => {
    const [id1, id2] = sel
    if (!id1 || !id2) return
    const l1 = layers.find((l) => l.id === id1)
    const l2 = layers.find((l) => l.id === id2)
    if (!l1 || !l2) return

    setComputing(true)
    try {
      const turf = await import("@turf/turf")
      const pairs: OverlapResult["pairs"] = []

      for (const f1 of l1.geojson.features) {
        for (const f2 of l2.geojson.features) {
          if (!f1.geometry || !f2.geometry) continue
          if (f1.geometry.type !== "Polygon" && f1.geometry.type !== "MultiPolygon") continue
          if (f2.geometry.type !== "Polygon" && f2.geometry.type !== "MultiPolygon") continue
          try {
            const inter = turf.intersect(
              turf.featureCollection([f1 as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>, f2 as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>])
            )
            if (!inter) continue
            const areaM2 = turf.area(inter)
            if (areaM2 < 1) continue
            const areaHa = areaM2 / 10000
            const totalM2 = turf.area(f1)
            const pct = totalM2 > 0 ? (areaM2 / totalM2) * 100 : 0
            const n1 = (f1.properties?.nome ?? f1.properties?.name ?? "feat") as string
            const n2 = (f2.properties?.nome ?? f2.properties?.name ?? "feat") as string
            pairs.push({ feat1: n1, feat2: n2, areaHa: +areaHa.toFixed(2), pct: +pct.toFixed(1) })

            // Highlight intersection on map
            const map = mapRef.current
            if (map) {
              const L = await import("leaflet")
              L.geoJSON(inter, { style: { color: "#ff0000", weight: 3, fillColor: "#ff0000", fillOpacity: 0.45 } }).addTo(map)
            }
          } catch { /* skip invalid geometries */ }
        }
      }

      const totalHa = pairs.reduce((s, p) => s + p.areaHa, 0)
      setOverlap({ layer1: l1.name, layer2: l2.name, pairs, totalHa: +totalHa.toFixed(2) })
    } finally {
      setComputing(false)
    }
  }, [sel, layers])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r overflow-y-auto">
        {/* Base layers */}
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Camada base</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(BASE_LAYERS) as BaseKey[]).map((key) => (
              <button key={key} onClick={() => setActiveBase(key)}
                className={`text-xs px-2 py-1.5 rounded border transition-colors ${activeBase === key ? "bg-green-600 text-white border-green-600" : "border-gray-200 hover:border-green-400"}`}>
                {BASE_LAYERS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="p-3 border-b space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ferramentas</p>
          <button onClick={toggleDraw}
            className={`w-full text-sm px-3 py-1.5 rounded border transition-colors ${drawing ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:border-blue-400"}`}>
            {drawing ? "✏️ Desenhando..." : "✏️ Desenhar polígono"}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="w-full text-sm px-3 py-1.5 rounded border border-gray-200 hover:border-green-400 transition-colors">
            📂 Carregar arquivo
          </button>
          <input ref={fileRef} type="file" accept=".geojson,.json,.zip,.shp" className="hidden" onChange={handleFile} />
        </div>

        {/* Sample files */}
        <div className="p-3 border-b space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Arquivos de exemplo</p>
          <button onClick={() => loadSample("floresta-exemplo.geojson", "Floresta Exemplo")}
            className="w-full text-xs px-2 py-1.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors text-left">
            🌲 Floresta (3 talhões)
          </button>
          <button onClick={() => loadSample("restricoes-exemplo.geojson", "Restrições Exemplo")}
            className="w-full text-xs px-2 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition-colors text-left">
            🚫 Restrições (embargo/APP/TI)
          </button>
        </div>

        {/* Layers list */}
        <div className="p-3 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Camadas ({layers.length})</p>
          {layers.length === 0 && <p className="text-xs text-gray-400">Nenhuma camada carregada.</p>}
          <div className="space-y-1">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center gap-2 text-xs py-1 group">
                <input type="checkbox" checked={layer.visible}
                  onChange={(e) => setLayers((prev) => prev.map((l) => l.id === layer.id ? { ...l, visible: e.target.checked } : l))}
                  className="rounded" />
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: layer.color }} />
                <span className="flex-1 truncate" title={layer.name}>{layer.name}</span>
                <button onClick={() => { setLayers((prev) => prev.filter((l) => l.id !== layer.id)); layerMapRef.current.delete(layer.id) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Overlap analysis */}
        {layers.length >= 2 && (
          <div className="p-3 border-t">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Análise de sobreposição</p>
            <select className="w-full text-xs border rounded px-2 py-1 mb-1" value={sel[0] ?? ""} onChange={(e) => setSel([e.target.value, sel[1]])}>
              <option value="">Camada 1...</option>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select className="w-full text-xs border rounded px-2 py-1 mb-2" value={sel[1] ?? ""} onChange={(e) => setSel([sel[0], e.target.value])}>
              <option value="">Camada 2...</option>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button onClick={computeOverlap} disabled={!sel[0] || !sel[1] || computing}
              className="w-full text-xs px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 transition-colors">
              {computing ? "Calculando..." : "🔍 Calcular sobreposição"}
            </button>
          </div>
        )}
      </div>

      {/* Map + Overlap Results */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Map */}
        <div ref={containerRef} className="flex-1 min-h-0" style={{ minHeight: overlap ? "60%" : "100%" }} />

        {/* Overlap Results */}
        {overlap && (
          <div className="border-t bg-white p-4 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                Sobreposição: <span className="text-blue-600">{overlap.layer1}</span> × <span className="text-red-600">{overlap.layer2}</span>
              </h3>
              <button onClick={() => setOverlap(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Fechar</button>
            </div>
            {overlap.pairs.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma sobreposição encontrada entre as camadas.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">Total sobreposto: <strong>{overlap.totalHa} ha</strong> em {overlap.pairs.length} intersecção(ões)</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-1.5 border">Feição (Camada 1)</th>
                      <th className="text-left p-1.5 border">Feição (Camada 2)</th>
                      <th className="text-right p-1.5 border">Área (ha)</th>
                      <th className="text-right p-1.5 border">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlap.pairs.map((p, i) => (
                      <tr key={i} className={p.pct > 50 ? "bg-red-50" : p.pct > 20 ? "bg-yellow-50" : ""}>
                        <td className="p-1.5 border">{p.feat1}</td>
                        <td className="p-1.5 border">{p.feat2}</td>
                        <td className="p-1.5 border text-right font-mono">{p.areaHa}</td>
                        <td className={`p-1.5 border text-right font-mono font-bold ${p.pct > 50 ? "text-red-600" : p.pct > 20 ? "text-yellow-600" : "text-green-600"}`}>{p.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {/* Save polygon modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="font-semibold mb-3">Salvar polígono desenhado</h3>
            <input autoFocus value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveDrawn()}
              placeholder="Nome / rótulo do polígono..."
              className="w-full border rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal({ open: false }); drawnGroupRef.current?.clearLayers(); setLabelInput("") }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Cancelar</button>
              <button onClick={saveDrawn} disabled={!labelInput.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
