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
  totalAreaHa?: number
}

interface OverlapPair {
  feat1: string
  feat2: string
  areaHa: number
  pctOfLayer1: number
  pctOfLayer2: number
}

interface OverlapResult {
  layer1: string
  layer2: string
  layer1TotalHa: number
  layer2TotalHa: number
  pairs: OverlapPair[]
  totalOverlapHa: number
}

const BASE_LAYERS = {
  osm:       { label: "OpenStreetMap",     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                                               attr: "© OpenStreetMap contributors" },
  satellite: { label: "Satélite (ESRI)",   url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",                   attr: "Tiles © Esri" },
  topo:      { label: "Topográfico",       url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",                  attr: "Tiles © Esri" },
  relief:    { label: "Relevo (OpenTopo)", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",                                                                 attr: "© OpenTopoMap" },
} as const
type BaseKey = keyof typeof BASE_LAYERS

const COLORS = ["#2563eb","#16a34a","#dc2626","#9333ea","#ea580c","#0891b2","#65a30d","#db2777","#b45309","#0f766e"]

function calcAreaHa(geojson: GeoJSON.FeatureCollection, turf: typeof import("@turf/turf")): number {
  return geojson.features.reduce((sum, f) => {
    if (!f.geometry) return sum
    try { return sum + turf.area(f) / 10000 } catch { return sum }
  }, 0)
}

export function GeospatialMap({ projectId }: { projectId?: number }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<import("leaflet").Map | null>(null)
  const baseTileRef   = useRef<import("leaflet").TileLayer | null>(null)
  const drawnGroupRef = useRef<import("leaflet").FeatureGroup | null>(null)
  const layerMapRef   = useRef<Map<string, import("leaflet").GeoJSON>>(new Map())
  const interLayersRef = useRef<import("leaflet").GeoJSON[]>([])
  const drawCtrlObj   = useRef<{ ctrl: unknown }>({ ctrl: null })

  const [layers,     setLayers]     = useState<MapLayer[]>([])
  const [activeBase, setActiveBase] = useState<BaseKey>("osm")
  const [drawing,    setDrawing]    = useState(false)
  const [overlap,    setOverlap]    = useState<OverlapResult | null>(null)
  const [sel,        setSel]        = useState<[string?, string?]>([])
  const [computing,  setComputing]  = useState(false)
  const [modal,      setModal]      = useState<{ open: boolean; geojson?: GeoJSON.Feature }>({ open: false })
  const [labelInput, setLabelInput] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    Promise.all([import("leaflet"), import("leaflet-draw")]).then(([L]) => {
      if (destroyed || !containerRef.current) return

      const proto = L.Icon.Default.prototype as unknown as Record<string, unknown>
      delete proto._getIconUrl
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DrawControl = (L as any).Control?.Draw
      if (DrawControl) {
        const ctrl = new DrawControl({
          draw: { polygon: { shapeOptions: { color: "#2563eb" } }, polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false },
          edit: { featureGroup: drawn },
        })
        drawCtrlObj.current.ctrl = ctrl
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
          layer.visible ? map.addLayer(existing) : map.removeLayer(existing)
          return
        }
        if (!layer.visible) return
        const gl = L.geoJSON(layer.geojson, {
          style: { color: layer.color, weight: 2, fillOpacity: 0.2 },
          onEachFeature: (f, lyr) => {
            const p = f.properties ?? {}
            const name = p.nome ?? p.name ?? p.id ?? "Feature"
            const rows = Object.entries(p).filter(([k]) => k !== "nome" && k !== "name")
              .map(([k, v]) => `<tr><td class="pr-2 text-gray-500">${k}</td><td>${v}</td></tr>`).join("")
            lyr.bindPopup(`<strong>${name}</strong>${rows ? `<table class="mt-1 text-xs">${rows}</table>` : ""}`)
          },
        })
        gl.addTo(map)
        layerMapRef.current.set(layer.id, gl)
      })

      layerMapRef.current.forEach((gl, id) => {
        if (!layers.find((l) => l.id === id)) { map.removeLayer(gl); layerMapRef.current.delete(id) }
      })
    })
  }, [layers])

  // ── Toggle draw ───────────────────────────────────────────────────────────
  const toggleDraw = useCallback(() => {
    const map = mapRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = drawCtrlObj.current.ctrl as any
    if (!map || !ctrl) return
    if (!drawing) { map.addControl(ctrl); setDrawing(true) }
    else          { map.removeControl(ctrl); setDrawing(false) }
  }, [drawing])

  // ── Save drawn polygon ────────────────────────────────────────────────────
  const saveDrawn = useCallback(async () => {
    if (!modal.geojson || !labelInput.trim()) return
    const feature = { ...modal.geojson, properties: { nome: labelInput, fonte: "Desenhado", projeto: projectId } }
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [feature] }
    const turf = await import("@turf/turf")
    const areaHa = calcAreaHa(fc, turf)
    const color = COLORS[layers.length % COLORS.length]
    setLayers((p) => [...p, { id: uuidv4(), name: labelInput, color, geojson: fc, visible: true, source: "drawn", totalAreaHa: +areaHa.toFixed(2) }])
    drawnGroupRef.current?.clearLayers()
    setModal({ open: false })
    setLabelInput("")
  }, [modal, labelInput, layers.length, projectId])

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
        const r = await shp(buf)
        geojson = Array.isArray(r) ? r[0] : r
      } else {
        alert("Formato não suportado. Use .geojson, .json ou .zip (shapefile)."); return
      }
    } catch { alert("Erro ao ler o arquivo."); return }
    if (!geojson) return

    const turf = await import("@turf/turf")
    const areaHa = calcAreaHa(geojson, turf)
    const color = COLORS[layers.length % COLORS.length]
    const name = file.name.replace(/\.(geojson|json|zip|shp)$/i, "")
    setLayers((p) => [...p, { id: uuidv4(), name, color, geojson, visible: true, source: "upload", totalAreaHa: +areaHa.toFixed(2) }])
  }, [layers.length])

  // ── Load sample ───────────────────────────────────────────────────────────
  const loadSample = useCallback(async (filename: string, label: string) => {
    const geojson: GeoJSON.FeatureCollection = await (await fetch(`/samples/${filename}`)).json()
    const turf = await import("@turf/turf")
    const areaHa = calcAreaHa(geojson, turf)
    const color = COLORS[layers.length % COLORS.length]
    setLayers((p) => [...p, { id: uuidv4(), name: label, color, geojson, visible: true, source: "sample", totalAreaHa: +areaHa.toFixed(2) }])
  }, [layers.length])

  // ── Export layer ──────────────────────────────────────────────────────────
  const exportLayer = useCallback((layer: MapLayer) => {
    const blob = new Blob([JSON.stringify(layer.geojson, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${layer.name.replace(/\s+/g, "_")}.geojson`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // ── Zoom to layer ─────────────────────────────────────────────────────────
  const zoomToLayer = useCallback((layerId: string) => {
    const gl = layerMapRef.current.get(layerId)
    const map = mapRef.current
    if (!gl || !map) return
    try { map.fitBounds(gl.getBounds(), { padding: [40, 40] }) } catch { /* empty bounds */ }
  }, [])

  // ── Remove layer ──────────────────────────────────────────────────────────
  const removeLayer = useCallback((id: string) => {
    const gl = layerMapRef.current.get(id)
    if (gl && mapRef.current) mapRef.current.removeLayer(gl)
    layerMapRef.current.delete(id)
    setLayers((p) => p.filter((l) => l.id !== id))
  }, [])

  // ── Overlap analysis ──────────────────────────────────────────────────────
  const computeOverlap = useCallback(async () => {
    const [id1, id2] = sel
    if (!id1 || !id2) return
    const l1 = layers.find((l) => l.id === id1)
    const l2 = layers.find((l) => l.id === id2)
    if (!l1 || !l2) return

    // Clear previous intersection layers
    interLayersRef.current.forEach((il) => mapRef.current?.removeLayer(il))
    interLayersRef.current = []

    setComputing(true)
    try {
      const turf = await import("@turf/turf")
      const pairs: OverlapPair[] = []

      for (const f1 of l1.geojson.features) {
        for (const f2 of l2.geojson.features) {
          if (!f1.geometry || !f2.geometry) continue
          if (!["Polygon","MultiPolygon"].includes(f1.geometry.type)) continue
          if (!["Polygon","MultiPolygon"].includes(f2.geometry.type)) continue
          try {
            const inter = turf.intersect(
              turf.featureCollection([
                f1 as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
                f2 as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
              ])
            )
            if (!inter) continue
            const interM2  = turf.area(inter)
            if (interM2 < 1) continue
            const f1M2 = turf.area(f1)
            const f2M2 = turf.area(f2)
            pairs.push({
              feat1: String(f1.properties?.nome ?? f1.properties?.name ?? "feat"),
              feat2: String(f2.properties?.nome ?? f2.properties?.name ?? "feat"),
              areaHa: +(interM2 / 10000).toFixed(2),
              pctOfLayer1: f1M2 > 0 ? +((interM2 / f1M2) * 100).toFixed(1) : 0,
              pctOfLayer2: f2M2 > 0 ? +((interM2 / f2M2) * 100).toFixed(1) : 0,
            })
            const map = mapRef.current
            if (map) {
              const L = await import("leaflet")
              const il = L.geoJSON(inter, { style: { color: "#ff0000", weight: 2, fillColor: "#ff0000", fillOpacity: 0.5 } })
              il.addTo(map)
              interLayersRef.current.push(il)
            }
          } catch { /* skip invalid */ }
        }
      }

      setOverlap({
        layer1: l1.name,
        layer2: l2.name,
        layer1TotalHa: l1.totalAreaHa ?? 0,
        layer2TotalHa: l2.totalAreaHa ?? 0,
        pairs,
        totalOverlapHa: +(pairs.reduce((s, p) => s + p.areaHa, 0)).toFixed(2),
      })
    } finally { setComputing(false) }
  }, [sel, layers])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0">

      {/* Left panel */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r overflow-y-auto text-sm">

        {/* Base layers */}
        <section className="p-3 border-b">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camada base</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(BASE_LAYERS) as BaseKey[]).map((k) => (
              <button key={k} onClick={() => setActiveBase(k)}
                className={`text-xs px-2 py-1.5 rounded border transition-colors ${activeBase === k ? "bg-green-600 text-white border-green-600" : "border-gray-200 hover:border-green-400"}`}>
                {BASE_LAYERS[k].label}
              </button>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="p-3 border-b space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ferramentas</p>
          <button onClick={toggleDraw}
            className={`w-full text-xs px-3 py-1.5 rounded border transition-colors ${drawing ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:border-blue-400"}`}>
            {drawing ? "✏️ Desenhando — clique para parar" : "✏️ Desenhar polígono (AOI)"}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="w-full text-xs px-3 py-1.5 rounded border border-gray-200 hover:border-green-400 transition-colors">
            📂 Carregar arquivo (.geojson / .zip)
          </button>
          <input ref={fileRef} type="file" accept=".geojson,.json,.zip,.shp" className="hidden" onChange={handleFile} />
        </section>

        {/* Samples */}
        <section className="p-3 border-b space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Exemplos</p>
          <button onClick={() => loadSample("floresta-exemplo.geojson", "Floresta Exemplo")}
            className="w-full text-xs px-2 py-1.5 rounded border border-green-200 text-green-700 hover:bg-green-50 text-left transition-colors">
            🌲 Floresta (3 talhões)
          </button>
          <button onClick={() => loadSample("restricoes-exemplo.geojson", "Restrições Exemplo")}
            className="w-full text-xs px-2 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 text-left transition-colors">
            🚫 Restrições (embargo/APP/TI)
          </button>
        </section>

        {/* Layers */}
        <section className="p-3 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camadas ({layers.length})</p>
          {layers.length === 0 && <p className="text-xs text-gray-400">Nenhuma camada carregada.</p>}
          <div className="space-y-2">
            {layers.map((layer) => (
              <div key={layer.id} className="rounded border border-gray-100 p-2 group">
                <div className="flex items-center gap-1.5">
                  <input type="checkbox" checked={layer.visible} className="rounded flex-shrink-0"
                    onChange={(e) => setLayers((p) => p.map((l) => l.id === layer.id ? { ...l, visible: e.target.checked } : l))} />
                  <span className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/30" style={{ backgroundColor: layer.color }} />
                  <span className="flex-1 truncate text-xs font-medium" title={layer.name}>{layer.name}</span>

                  {/* Zoom to layer */}
                  <button title="Ir para localização" onClick={() => zoomToLayer(layer.id)}
                    className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity text-base leading-none" >
                    🎯
                  </button>
                  {/* Export */}
                  <button title="Exportar GeoJSON" onClick={() => exportLayer(layer)}
                    className="opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-800 transition-opacity text-xs font-bold">
                    ↓
                  </button>
                  {/* Remove */}
                  <button title="Remover camada" onClick={() => removeLayer(layer.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity text-xs">
                    ✕
                  </button>
                </div>
                {layer.totalAreaHa !== undefined && (
                  <p className="text-xs text-gray-400 mt-1 pl-5">{layer.totalAreaHa.toLocaleString("pt-BR")} ha total</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Overlap */}
        {layers.length >= 2 && (
          <section className="p-3 border-t">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sobreposição</p>
            <select className="w-full text-xs border rounded px-2 py-1 mb-1" value={sel[0] ?? ""}
              onChange={(e) => setSel([e.target.value, sel[1]])}>
              <option value="">Camada AOI (base)...</option>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select className="w-full text-xs border rounded px-2 py-1 mb-2" value={sel[1] ?? ""}
              onChange={(e) => setSel([sel[0], e.target.value])}>
              <option value="">Camada de restrição...</option>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button onClick={computeOverlap} disabled={!sel[0] || !sel[1] || computing}
              className="w-full text-xs px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 transition-colors">
              {computing ? "Calculando..." : "🔍 Calcular sobreposição"}
            </button>
          </section>
        )}
      </div>

      {/* Map + Results */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={containerRef} className="flex-1 min-h-0" />

        {overlap && (
          <div className="border-t bg-white max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="font-semibold text-sm">
                <span style={{ color: layers.find(l=>l.name===overlap.layer1)?.color }}>{overlap.layer1}</span>
                <span className="text-gray-400 mx-1">×</span>
                <span style={{ color: layers.find(l=>l.name===overlap.layer2)?.color }}>{overlap.layer2}</span>
              </h3>
              <button onClick={() => { setOverlap(null); interLayersRef.current.forEach(l => mapRef.current?.removeLayer(l)); interLayersRef.current = [] }}
                className="text-xs text-gray-400 hover:text-gray-600">✕ Fechar</button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-2 text-xs">
              <div className="bg-blue-50 rounded p-2">
                <p className="text-gray-500">Área camada 1</p>
                <p className="font-bold text-blue-700">{overlap.layer1TotalHa.toLocaleString("pt-BR")} ha</p>
              </div>
              <div className="bg-red-50 rounded p-2">
                <p className="text-gray-500">Área camada 2</p>
                <p className="font-bold text-red-700">{overlap.layer2TotalHa.toLocaleString("pt-BR")} ha</p>
              </div>
              <div className="bg-orange-50 rounded p-2">
                <p className="text-gray-500">Sobreposição total</p>
                <p className="font-bold text-orange-700">{overlap.totalOverlapHa.toLocaleString("pt-BR")} ha</p>
              </div>
            </div>

            {overlap.pairs.length === 0 ? (
              <p className="text-xs text-gray-500 px-4 pb-3">Nenhuma sobreposição encontrada.</p>
            ) : (
              <table className="w-full text-xs border-collapse px-4">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-1.5 border">Feição AOI</th>
                    <th className="p-1.5 border">Feição restrição</th>
                    <th className="p-1.5 border text-right">Área (ha)</th>
                    <th className="p-1.5 border text-right">% da AOI</th>
                    <th className="p-1.5 border text-right">% da restrição</th>
                  </tr>
                </thead>
                <tbody>
                  {overlap.pairs.map((p, i) => (
                    <tr key={i} className={p.pctOfLayer1 > 50 ? "bg-red-50" : p.pctOfLayer1 > 20 ? "bg-yellow-50" : ""}>
                      <td className="p-1.5 border">{p.feat1}</td>
                      <td className="p-1.5 border">{p.feat2}</td>
                      <td className="p-1.5 border text-right font-mono">{p.areaHa}</td>
                      <td className={`p-1.5 border text-right font-mono font-bold ${p.pctOfLayer1>50?"text-red-600":p.pctOfLayer1>20?"text-yellow-600":"text-green-700"}`}>{p.pctOfLayer1}%</td>
                      <td className="p-1.5 border text-right font-mono text-gray-600">{p.pctOfLayer2}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Save modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="font-semibold mb-1">Salvar polígono desenhado</h3>
            <p className="text-xs text-gray-500 mb-3">Este polígono representa sua Área de Interesse (AOI){projectId ? ` no projeto #${projectId}` : ""}.</p>
            <input autoFocus value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveDrawn()}
              placeholder="Nome / rótulo do polígono..."
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal({ open: false }); drawnGroupRef.current?.clearLayers(); setLabelInput("") }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Cancelar</button>
              <button onClick={saveDrawn} disabled={!labelInput.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
                Salvar camada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
