"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import {
  Pencil, Upload, Ban, TreePine, Target, Download, Trash2,
  Sun, Moon, ChevronLeft, ChevronRight, Eye, EyeOff, Layers,
  Zap, X, Save, MapPin, Edit2, Loader2, Check, CloudOff,
  AlertCircle, RotateCcw, CloudCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type LayerType  = "aoi" | "restriction" | null
type Theme      = "light" | "dark"
type SyncStatus = "saving" | "saved" | "error" | "local"

interface MapLayer {
  id:          string
  dbId?:       number          // persisted DB record id
  name:        string
  color:       string
  geojson:     GeoJSON.FeatureCollection
  visible:     boolean
  source:      "drawn" | "upload" | "sample"
  totalAreaHa: number
  layerType:   LayerType
  syncStatus?: SyncStatus      // undefined = not yet attempted
}

interface OverlapEntry {
  aoiFeat: string; restrictFeat: string
  areaHa: number; pctOfAoi: number; pctOfRestriction: number
  intersection: GeoJSON.Feature
}
interface RestrictionResult {
  restrictionId: string; restrictionName: string; restrictionTotalHa: number
  entries: OverlapEntry[]; totalOverlapHa: number; pctOfAoiAffected: number
}
interface AoiResult {
  aoiId: string; aoiName: string; aoiTotalHa: number
  restrictions: RestrictionResult[]
  totalAffectedHa: number; pctTotalAffected: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_LAYERS = {
  osm:       { label: "OpenStreetMap",    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                                      attr: "© OpenStreetMap contributors" },
  satellite: { label: "Satélite (ESRI)", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",            attr: "Tiles © Esri" },
  topo:      { label: "Topográfico",     url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",           attr: "Tiles © Esri" },
  relief:    { label: "Relevo",          url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",                                                          attr: "© OpenTopoMap" },
} as const
type BaseKey = keyof typeof BASE_LAYERS

const AOI_COLORS         = ["#2563eb","#0891b2","#7c3aed","#0f766e","#1d4ed8"]
const RESTRICTION_COLORS = ["#dc2626","#ea580c","#db2777","#b45309","#9333ea"]

function nextColor(layers: MapLayer[], type: LayerType): string {
  const pool = type === "restriction" ? RESTRICTION_COLORS : AOI_COLORS
  const used = layers.filter(l => l.layerType === type).length
  return pool[used % pool.length]
}

/**
 * Reduces GeoJSON geometry precision/vertices so it fits within the API
 * body limit (≤ 10 MB).  The full-resolution geometry is kept in memory
 * for analysis; only the stored copy is simplified.
 *
 * Strategy:
 *  1. If the serialised size is already ≤ 10 MB → return as-is
 *  2. Otherwise round coordinates to 5 decimal places (~1 m precision)
 *  3. If still too large, apply turf.simplify with increasing tolerance
 */
async function simplifyForStorage(
  geojson: GeoJSON.FeatureCollection,
  limitBytes = 10_000_000,
): Promise<{ geojson: GeoJSON.FeatureCollection; simplified: boolean }> {
  const serialize = (g: GeoJSON.FeatureCollection) => JSON.stringify(g)

  if (new Blob([serialize(geojson)]).size <= limitBytes) {
    return { geojson, simplified: false }
  }

  // Step 1 – round coordinates to 5 decimal places
  function roundCoords(coords: unknown): unknown {
    if (typeof coords === "number") return Math.round(coords * 1e5) / 1e5
    if (Array.isArray(coords))     return coords.map(roundCoords)
    return coords
  }
  let candidate: GeoJSON.FeatureCollection = {
    ...geojson,
    features: geojson.features.map(f => ({
      ...f,
      geometry: f.geometry
        ? { ...f.geometry, coordinates: roundCoords((f.geometry as { coordinates: unknown }).coordinates) }
        : f.geometry,
    })) as GeoJSON.Feature[],
  }
  if (new Blob([serialize(candidate)]).size <= limitBytes) {
    return { geojson: candidate, simplified: true }
  }

  // Step 2 – turf simplify with escalating tolerance
  const turf = await import("@turf/turf")
  const POLY_TYPES = ["Polygon", "MultiPolygon"]
  for (const tolerance of [0.0001, 0.001, 0.005, 0.02, 0.1]) {
    candidate = {
      ...geojson,
      features: geojson.features.map(f => {
        if (!f.geometry || !POLY_TYPES.includes(f.geometry.type)) return f
        try {
          return turf.simplify(
            f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
            { tolerance, highQuality: false, mutate: false },
          )
        } catch { return f }
      }),
    }
    if (new Blob([serialize(candidate)]).size <= limitBytes) {
      return { geojson: candidate, simplified: true }
    }
  }

  // Still too large — return best attempt (caller can decide)
  return { geojson: candidate, simplified: true }
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

// ── Theme helpers ──────────────────────────────────────────────────────────────

function th(dk: boolean) {
  return {
    panel:    dk ? "bg-zinc-900 text-zinc-200 border-zinc-700/50" : "bg-white text-zinc-800 border-zinc-200",
    header:   dk ? "bg-zinc-800 border-zinc-700/50 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-600",
    section:  dk ? "border-zinc-700/50" : "border-zinc-200",
    label:    dk ? "text-zinc-500" : "text-zinc-400",
    muted:    dk ? "text-zinc-500" : "text-zinc-400",
    text:     dk ? "text-zinc-200" : "text-zinc-800",
    btn:      dk ? "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800",
    btnBlue:  dk ? "border-blue-700/60 bg-blue-900/20 text-blue-300 hover:bg-blue-800/30"      : "border-blue-200 text-blue-700 hover:bg-blue-50",
    btnRed:   dk ? "border-red-700/60  bg-red-900/20  text-red-300  hover:bg-red-800/30"       : "border-red-200  text-red-700  hover:bg-red-50",
    row:      dk ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600" : "bg-white border-zinc-200 hover:border-zinc-300",
    input:    dk ? "bg-zinc-700 border-zinc-600 text-zinc-200 placeholder:text-zinc-500 focus:ring-emerald-500/40" : "border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus:ring-emerald-500/40",
    modal:    dk ? "bg-zinc-900 border border-zinc-700" : "bg-white",
    resultHd: dk ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-200",
  }
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
  const layersRef      = useRef<MapLayer[]>([])

  const [layers,       setLayers]      = useState<MapLayer[]>([])
  const [mapReady,     setMapReady]    = useState(false)
  const [activeBase,   setActiveBase]  = useState<BaseKey>("osm")
  const [drawing,      setDrawing]     = useState(false)
  const [results,      setResults]     = useState<AoiResult[]>([])
  const [computing,    setComputing]   = useState(false)
  const [modal,        setModal]       = useState<{ open: boolean; geojson?: GeoJSON.Feature }>({ open: false })
  const [labelInput,   setLabelInput]  = useState("")
  const [newLayerType, setNewLayerType] = useState<LayerType>("aoi")
  const [saving,       setSaving]      = useState(false)
  const [saveDialog,   setSaveDialog]  = useState<{ open: boolean; aoiResult?: AoiResult; name: string; notes: string }>({ open: false, name: "", notes: "" })
  const [theme,        setTheme]       = useState<Theme>("light")
  const [panelOpen,    setPanelOpen]   = useState(true)
  const [loadingLayers,setLoadingLayers] = useState(false)

  const dk = theme === "dark"
  const T  = th(dk)

  // Keep ref in sync for callbacks that can't depend on `layers`
  useEffect(() => { layersRef.current = layers }, [layers])

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
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      const map  = L.map(containerRef.current!, { center: [-2.52, -54.76], zoom: 10 })
      const tile = L.tileLayer(BASE_LAYERS.osm.url, { attribution: BASE_LAYERS.osm.attr, maxZoom: 19 })
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
      setMapReady(true)
    })

    return () => { destroyed = true; mapRef.current?.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load saved layers from DB after map is ready ────────────────────────────
  useEffect(() => {
    if (!projectId || !mapReady) return
    setLoadingLayers(true)
    fetch(`/api/aoi-analysis?project=${projectId}&type=layer`)
      .then(r => r.json())
      .then(async (data: unknown[]) => {
        if (!Array.isArray(data) || data.length === 0) return
        const restored: MapLayer[] = []
        for (const record of data as Array<Record<string, unknown>>) {
          if (!record.geojson) continue
          try {
            const geojson = JSON.parse(record.geojson as string) as GeoJSON.FeatureCollection
            const meta    = (record.analysisResult ?? {}) as Record<string, unknown>
            const areaHa  = +(await calcAreaHa(geojson)).toFixed(2)
            restored.push({
              id:          uuidv4(),
              dbId:        record.id as number,
              name:        (record.name as string | null) ?? "Camada",
              color:       (meta.color as string | null) ?? "#2563eb",
              geojson,
              visible:     true,
              source:      ((meta.source as string) ?? "upload") as MapLayer["source"],
              totalAreaHa: areaHa,
              layerType:   (meta.layerType as LayerType) ?? null,
              syncStatus:  "saved" as SyncStatus,
            })
          } catch { /* skip malformed records */ }
        }
        if (restored.length > 0) setLayers(restored)
      })
      .catch(() => { /* non-critical */ })
      .finally(() => setLoadingLayers(false))
  }, [projectId, mapReady])

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
            const p    = f.properties ?? {}
            const name = String(p.nome ?? p.name ?? p.id ?? "Feature")
            const rows = Object.entries(p).filter(([k]) => !["nome","name"].includes(k))
              .map(([k,v]) => `<tr><td class="pr-2 opacity-60">${k}</td><td>${v}</td></tr>`).join("")
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

  // ── Save a single layer to DB ────────────────────────────────────────────────
  // • Marks the layer "saving" while in flight
  // • Simplifies the GeoJSON if it exceeds ~10 MB (shapefiles can be very large)
  // • Updates syncStatus to "saved" or "error" when done
  const saveLayerToDB = useCallback(async (layer: MapLayer): Promise<number | undefined> => {
    if (!projectId) {
      setLayers(p => p.map(l => l.id === layer.id ? { ...l, syncStatus: "local" } : l))
      return undefined
    }

    // Mark as saving
    setLayers(p => p.map(l => l.id === layer.id ? { ...l, syncStatus: "saving" } : l))

    try {
      const { geojson: geojsonToSave } = await simplifyForStorage(layer.geojson)

      const res = await fetch("/api/aoi-analysis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name:           layer.name,
          geojson:        JSON.stringify(geojsonToSave),
          sourceType:     "layer",
          analysisResult: { layerType: layer.layerType, color: layer.color, source: layer.source },
        }),
      })

      if (!res.ok) {
        setLayers(p => p.map(l => l.id === layer.id ? { ...l, syncStatus: "error" } : l))
        return undefined
      }

      const data = await res.json()
      const dbId = data.id as number | undefined
      setLayers(p => p.map(l => l.id === layer.id ? { ...l, dbId, syncStatus: "saved" } : l))
      return dbId
    } catch {
      setLayers(p => p.map(l => l.id === layer.id ? { ...l, syncStatus: "error" } : l))
      return undefined
    }
  }, [projectId])

  // ── Toggle draw ─────────────────────────────────────────────────────────────
  const toggleDraw = useCallback(() => {
    const map  = mapRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = drawCtrlObj.current.ctrl as any
    if (!map || !ctrl) return
    if (!drawing) { map.addControl(ctrl); setDrawing(true) }
    else          { map.removeControl(ctrl); setDrawing(false) }
  }, [drawing])

  // ── Save drawn polygon + persist ────────────────────────────────────────────
  const saveDrawn = useCallback(async () => {
    if (!modal.geojson || !labelInput.trim()) return
    const feature = { ...modal.geojson, properties: { nome: labelInput, tipo: newLayerType === "aoi" ? "Área Alvo" : "Restrição" } }
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [feature] }
    const areaHa  = +(await calcAreaHa(fc)).toFixed(2)
    const color   = nextColor(layersRef.current, newLayerType)
    const newLayer: MapLayer = { id: uuidv4(), name: labelInput, color, geojson: fc, visible: true, source: "drawn", totalAreaHa: areaHa, layerType: newLayerType }
    setLayers(p => [...p, newLayer])
    drawnGroupRef.current?.clearLayers()
    setModal({ open: false }); setLabelInput("")
    saveLayerToDB(newLayer)  // updates syncStatus + dbId internally
  }, [modal, labelInput, newLayerType, saveLayerToDB])

  // ── File upload + persist ───────────────────────────────────────────────────
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

    const areaHa  = +(await calcAreaHa(geojson)).toFixed(2)
    const color   = nextColor(layersRef.current, type)
    const name    = file.name.replace(/\.(geojson|json|zip|shp)$/i, "")
    const newLayer: MapLayer = { id: uuidv4(), name, color, geojson, visible: true, source: "upload", totalAreaHa: areaHa, layerType: type }
    setLayers(p => [...p, newLayer])
    saveLayerToDB(newLayer)  // updates syncStatus + dbId internally
  }, [saveLayerToDB])

  // ── Load sample + persist ───────────────────────────────────────────────────
  const loadSample = useCallback(async (filename: string, label: string, type: LayerType) => {
    const geojson: GeoJSON.FeatureCollection = await (await fetch(`/samples/${filename}`)).json()
    const areaHa  = +(await calcAreaHa(geojson)).toFixed(2)
    const color   = nextColor(layersRef.current, type)
    const newLayer: MapLayer = { id: uuidv4(), name: label, color, geojson, visible: true, source: "sample", totalAreaHa: areaHa, layerType: type }
    setLayers(p => [...p, newLayer])
    saveLayerToDB(newLayer)  // updates syncStatus + dbId internally
  }, [saveLayerToDB])

  // ── Zoom to layer ───────────────────────────────────────────────────────────
  const zoomTo = useCallback((id: string) => {
    const gl = layerMapRef.current.get(id)
    if (!gl || !mapRef.current) return
    try { mapRef.current.fitBounds(gl.getBounds(), { padding: [40, 40] }) } catch { /* empty */ }
  }, [])

  // ── Remove layer + delete from DB ───────────────────────────────────────────
  const removeLayer = useCallback((id: string, dbId?: number) => {
    const gl = layerMapRef.current.get(id)
    if (gl && mapRef.current) mapRef.current.removeLayer(gl)
    layerMapRef.current.delete(id)
    setLayers(p => p.filter(l => l.id !== id))
    if (dbId && projectId) {
      fetch(`/api/aoi-analysis/${dbId}`, { method: "DELETE" }).catch(() => {})
    }
  }, [projectId])

  // ── Rename layer + patch DB ─────────────────────────────────────────────────
  const renameLayer = useCallback((id: string, dbId: number | undefined, name: string) => {
    setLayers(p => p.map(l => l.id === id ? { ...l, name } : l))
    if (dbId && projectId) {
      fetch(`/api/aoi-analysis/${dbId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => {})
    }
  }, [projectId])

  // ── Set layer type ──────────────────────────────────────────────────────────
  const setLayerType = useCallback((id: string, dbId: number | undefined, type: LayerType) => {
    const current = layersRef.current
    const color   = nextColor(current.filter(x => x.id !== id), type)
    const source  = current.find(l => l.id === id)?.source
    const gl = layerMapRef.current.get(id)
    if (gl) gl.setStyle({ color, dashArray: type === "restriction" ? "6 3" : undefined })
    setLayers(p => p.map(l => l.id === id ? { ...l, layerType: type, color } : l))
    if (dbId && projectId) {
      fetch(`/api/aoi-analysis/${dbId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisResult: { layerType: type, color, source } }),
      }).catch(() => {})
    }
  }, [projectId])

  // ── Compute overlaps ────────────────────────────────────────────────────────
  const computeAllOverlaps = useCallback(async () => {
    const aoiLayers  = layers.filter(l => l.layerType === "aoi")
    const restLayers = layers.filter(l => l.layerType === "restriction")
    if (!aoiLayers.length || !restLayers.length) return
    interGroupRef.current?.clearLayers()
    setComputing(true)
    try {
      const turf = await import("@turf/turf")
      const L    = await import("leaflet")
      const aoiResults: AoiResult[] = []

      for (const aoi of aoiLayers) {
        const restrictionResults: RestrictionResult[] = []
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
                const enriched: GeoJSON.Feature = { ...inter, properties: {
                  aoi_layer: aoi.name, aoi_feature: String(f1.properties?.nome ?? f1.properties?.name ?? "feat"),
                  restriction_layer: rest.name, restriction_feature: String(f2.properties?.nome ?? f2.properties?.name ?? "feat"),
                  area_ha: +(areaM2 / 10000).toFixed(4),
                  pct_of_aoi: +(f1M2 > 0 ? (areaM2/f1M2)*100 : 0).toFixed(2),
                  pct_of_restriction: +(f2M2 > 0 ? (areaM2/f2M2)*100 : 0).toFixed(2),
                }}
                entries.push({
                  aoiFeat: String(f1.properties?.nome ?? f1.properties?.name ?? "feat"),
                  restrictFeat: String(f2.properties?.nome ?? f2.properties?.name ?? "feat"),
                  areaHa: +(areaM2/10000).toFixed(2),
                  pctOfAoi: +(f1M2>0?(areaM2/f1M2)*100:0).toFixed(1),
                  pctOfRestriction: +(f2M2>0?(areaM2/f2M2)*100:0).toFixed(1),
                  intersection: enriched,
                })
                const il = L.geoJSON(enriched, { style: { color: rest.color, weight: 1.5, fillColor: rest.color, fillOpacity: 0.6 } })
                il.bindPopup(`<strong>Sobreposição</strong><br/>${aoi.name} × ${rest.name}<br/>${+(areaM2/10000).toFixed(2)} ha`)
                interGroupRef.current?.addLayer(il)
              } catch { /* skip */ }
            }
          }
          if (entries.length > 0) {
            const totalOverlapHa = +(entries.reduce((s,e) => s + e.areaHa, 0)).toFixed(2)
            restrictionResults.push({
              restrictionId: rest.id, restrictionName: rest.name, restrictionTotalHa: rest.totalAreaHa,
              entries, totalOverlapHa,
              pctOfAoiAffected: +(aoi.totalAreaHa>0?(totalOverlapHa/aoi.totalAreaHa)*100:0).toFixed(1),
            })
          }
        }
        const totalAffected = +(restrictionResults.reduce((s,r) => s+r.totalOverlapHa, 0)).toFixed(2)
        aoiResults.push({
          aoiId: aoi.id, aoiName: aoi.name, aoiTotalHa: aoi.totalAreaHa,
          restrictions: restrictionResults, totalAffectedHa: totalAffected,
          pctTotalAffected: +(aoi.totalAreaHa>0?(totalAffected/aoi.totalAreaHa)*100:0).toFixed(1),
        })
      }
      setResults(aoiResults)
    } finally { setComputing(false) }
  }, [layers])

  const clearOverlaps = useCallback(() => { interGroupRef.current?.clearLayers(); setResults([]) }, [])

  // ── Export helpers ──────────────────────────────────────────────────────────
  const exportIntersections = useCallback((aoiResult: AoiResult, restResult?: RestrictionResult) => {
    const entries = restResult ? restResult.entries : aoiResult.restrictions.flatMap(r => r.entries)
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: entries.map(e => e.intersection) }
    downloadGeoJSON(fc, `sobreposicao_${aoiResult.aoiName}${restResult ? `_${restResult.restrictionName}` : "_todas"}`.replace(/\s+/g,"_"))
  }, [])

  const exportRestrictionsWithOverlap = useCallback((aoiResult: AoiResult, restResult?: RestrictionResult) => {
    const targets = restResult ? [restResult] : aoiResult.restrictions
    const feats: GeoJSON.Feature[] = []
    for (const r of targets) {
      const rl = layers.find(l => l.id === r.restrictionId)
      if (!rl) continue
      const names = new Set(r.entries.map(e => e.restrictFeat))
      feats.push(...rl.geojson.features.filter(f => names.has(String(f.properties?.nome ?? f.properties?.name ?? "feat")))
        .map(f => ({ ...f, properties: { ...f.properties, overlaps_with: aoiResult.aoiName, overlap_ha: r.totalOverlapHa } })))
    }
    downloadGeoJSON({ type: "FeatureCollection", features: feats }, `restricoes_sobrepostas_${aoiResult.aoiName.replace(/\s+/g,"_")}`)
  }, [layers])

  // ── Save analysis to project ────────────────────────────────────────────────
  const saveToProject = useCallback((aoiResult: AoiResult) => {
    if (!projectId) { alert("Abra esta análise a partir de um projeto para salvar."); return }
    setSaveDialog({ open: true, aoiResult, name: `Sobreposição – ${aoiResult.aoiName}`, notes: "" })
  }, [projectId])

  const confirmSave = useCallback(async () => {
    if (!saveDialog.aoiResult || !projectId) return
    setSaving(true)
    try {
      const allIntersections = saveDialog.aoiResult.restrictions.flatMap(r => r.entries.map(e => e.intersection))
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: allIntersections }
      const res = await fetch("/api/aoi-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name:       saveDialog.name.trim() || `Sobreposição – ${saveDialog.aoiResult.aoiName}`,
          notes:      saveDialog.notes.trim() || undefined,
          geojson:    JSON.stringify(fc),
          sourceType: "manual",
        }),
      })
      if (res.ok) {
        setSaveDialog({ open: false, name: "", notes: "" })
        onSaved?.()
      } else {
        alert("Erro ao salvar. Tente novamente.")
      }
    } finally { setSaving(false) }
  }, [saveDialog, projectId, onSaved])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const aoiLayers   = layers.filter(l => l.layerType === "aoi")
  const restLayers  = layers.filter(l => l.layerType === "restriction")
  const unsetLayers = layers.filter(l => !l.layerType)
  const canCompute  = aoiLayers.length > 0 && restLayers.length > 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 relative">

      {/* ── Reopen panel button ─────────────────────────────── */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          title="Abrir painel"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-[500] bg-white border border-zinc-200 border-l-0 rounded-r-lg px-1 py-3 shadow-md hover:bg-zinc-50 transition-colors"
        >
          <ChevronRight className="size-4 text-zinc-500" />
        </button>
      )}

      {/* ── Left panel ─────────────────────────────────────── */}
      {panelOpen && (
        <div className={cn("w-72 flex-shrink-0 flex flex-col border-r text-sm overflow-hidden", T.panel)}>

          {/* Panel header */}
          <div className={cn("flex items-center justify-between px-3 py-2 border-b flex-shrink-0", T.header)}>
            <div className="flex items-center gap-2">
              <Layers className="size-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Camadas</span>
              {loadingLayers && <Loader2 className="size-3 animate-spin text-emerald-500" />}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setTheme(dk ? "light" : "dark")}
                title={dk ? "Modo claro" : "Modo escuro"}
                className={cn("size-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors")}
              >
                {dk ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </button>
              <button onClick={() => setPanelOpen(false)} title="Recolher painel"
                className="size-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors">
                <ChevronLeft className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* Base layers */}
            <section className={cn("p-3 border-b", T.section)}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5", T.label)}>
                <MapPin className="size-3" /> Camada base
              </p>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(BASE_LAYERS) as BaseKey[]).map(k => (
                  <button key={k} onClick={() => setActiveBase(k)}
                    className={cn("text-xs px-2 py-1.5 rounded-lg border transition-colors font-medium",
                      activeBase === k
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : T.btn)}>
                    {BASE_LAYERS[k].label}
                  </button>
                ))}
              </div>
            </section>

            {/* Add layers */}
            <section className={cn("p-3 border-b space-y-1.5", T.section)}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5", T.label)}>
                <Upload className="size-3" /> Adicionar camada
              </p>

              <button onClick={toggleDraw}
                className={cn("flex w-full items-center gap-2 text-xs px-3 py-2 rounded-lg border font-medium transition-colors",
                  drawing ? "bg-blue-600 text-white border-blue-600 shadow-sm" : T.btn)}>
                <Pencil className="size-3.5 shrink-0" />
                {drawing ? "Desenhando… (clique para parar)" : "Desenhar polígono"}
              </button>

              <button onClick={() => { document.getElementById("file-aoi")?.click() }}
                className={cn("flex w-full items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors", T.btnBlue)}>
                <Upload className="size-3.5 shrink-0" />
                Carregar Área Alvo (AOI)
              </button>
              <input id="file-aoi" type="file" accept=".geojson,.json,.zip,.shp" className="hidden"
                onChange={e => handleFile(e, "aoi")} />

              <button onClick={() => document.getElementById("file-rest")?.click()}
                className={cn("flex w-full items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors", T.btnRed)}>
                <Ban className="size-3.5 shrink-0" />
                Carregar Restrição
              </button>
              <input id="file-rest" type="file" accept=".geojson,.json,.zip,.shp" className="hidden"
                onChange={e => handleFile(e, "restriction")} />
            </section>

            {/* Samples */}
            <section className={cn("p-3 border-b space-y-1.5", T.section)}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5", T.label)}>
                <TreePine className="size-3" /> Exemplos
              </p>
              <button onClick={() => loadSample("floresta-exemplo.geojson", "Floresta Exemplo", "aoi")}
                className={cn("flex w-full items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors", T.btnBlue)}>
                <TreePine className="size-3.5 shrink-0" /> Floresta (AOI)
              </button>
              <button onClick={() => loadSample("restricoes-exemplo.geojson", "Restrições Exemplo", "restriction")}
                className={cn("flex w-full items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors", T.btnRed)}>
                <Ban className="size-3.5 shrink-0" /> Restrições
              </button>
            </section>

            {/* Layer list */}
            <section className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5", T.label)}>
                  <Layers className="size-3" /> Camadas ({layers.length})
                </p>
              </div>

              {layers.length === 0 && !loadingLayers && (
                <p className={cn("text-xs text-center py-4", T.muted)}>Nenhuma camada adicionada.</p>
              )}

              {[
                { type: "aoi"         as LayerType, label: "Áreas Alvo (AOI)", dot: "bg-blue-500",  list: aoiLayers },
                { type: "restriction" as LayerType, label: "Restrições",        dot: "bg-red-500",   list: restLayers },
                { type: null,                        label: "Sem classificação", dot: "bg-zinc-400",  list: unsetLayers },
              ].filter(g => g.list.length > 0).map(group => (
                <div key={String(group.type)} className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={cn("size-2 rounded-full shrink-0", group.dot)} />
                    <p className={cn("text-[10px] font-medium", T.muted)}>{group.label}</p>
                  </div>
                  <div className="space-y-1.5">
                    {group.list.map(layer => (
                      <LayerRow key={layer.id} layer={layer} isDark={dk} T={T}
                        onToggleVisible={v => setLayers(p => p.map(l => l.id === layer.id ? { ...l, visible: v } : l))}
                        onZoom={() => zoomTo(layer.id)}
                        onExport={() => downloadGeoJSON(layer.geojson, `${layer.name.replace(/\s+/g,"_")}.geojson`)}
                        onRemove={() => removeLayer(layer.id, layer.dbId)}
                        onSetType={t => setLayerType(layer.id, layer.dbId, t)}
                        onRename={n => renameLayer(layer.id, layer.dbId, n)}
                        onRetrySync={() => saveLayerToDB(layer)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* Compute footer */}
          <div className={cn("p-3 border-t flex-shrink-0", T.section)}>
            {!canCompute ? (
              <p className={cn("text-xs text-center leading-relaxed", T.muted)}>
                Adicione ao menos 1 camada <span className="text-blue-500 font-medium">AOI</span> e 1{" "}
                <span className="text-red-500 font-medium">Restrição</span> para calcular sobreposição.
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className={cn("text-xs", T.muted)}>
                  <strong className={T.text}>{aoiLayers.length}</strong> AOI ×{" "}
                  <strong className={T.text}>{restLayers.length}</strong> restrição(ões)
                </p>
                <button onClick={computeAllOverlaps} disabled={computing}
                  className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-40 font-semibold transition-colors shadow-sm">
                  <Zap className="size-3.5" />
                  {computing ? "Calculando…" : "Calcular sobreposições"}
                </button>
                {results.length > 0 && (
                  <button onClick={clearOverlaps}
                    className={cn("w-full flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors", T.btn)}>
                    <X className="size-3" /> Limpar resultados
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Map + Results ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div ref={containerRef} className="flex-1 min-h-0" />

        {/* Results panel */}
        {results.length > 0 && (
          <div className="border-t bg-white overflow-y-auto" style={{ maxHeight: "45%" }}>
            <div className={cn("px-4 pt-3 pb-2 flex items-center justify-between border-b", T.resultHd)}>
              <h3 className="font-semibold text-sm text-zinc-800">Resultados de sobreposição</h3>
              <button onClick={clearOverlaps} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
                <X className="size-3.5" /> Fechar
              </button>
            </div>

            {results.map(aoi => (
              <div key={aoi.aoiId} className="border-b last:border-0">
                {/* AOI summary row */}
                <div className="px-4 py-2.5 bg-blue-50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-semibold text-sm text-blue-900">{aoi.aoiName}</span>
                    <span className="text-xs text-blue-500">{aoi.aoiTotalHa.toLocaleString("pt-BR")} ha</span>
                    {aoi.restrictions.length > 0 ? (
                      <span className={cn("text-xs font-bold", aoi.pctTotalAffected > 50 ? "text-red-600" : aoi.pctTotalAffected > 20 ? "text-amber-600" : "text-emerald-700")}>
                        {aoi.totalAffectedHa} ha afetado ({aoi.pctTotalAffected}%)
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium">Sem sobreposições</span>
                    )}
                  </div>
                  {aoi.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => exportIntersections(aoi)}
                        className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors">
                        <Download className="size-3 inline mr-1" />Intersecções
                      </button>
                      <button onClick={() => saveToProject(aoi)} disabled={saving || !projectId}
                        className="text-xs px-2 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors flex items-center gap-1">
                        <Save className="size-3" /> {saving ? "…" : "Salvar"}
                      </button>
                    </div>
                  )}
                </div>

                {aoi.restrictions.map(rest => (
                  <div key={rest.restrictionId} className="px-4 pb-3 pt-2">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-semibold text-red-700">{rest.restrictionName}</span>
                        <span className="text-zinc-400">{rest.restrictionTotalHa.toLocaleString("pt-BR")} ha</span>
                        <span className={cn("font-bold", rest.pctOfAoiAffected > 50 ? "text-red-600" : rest.pctOfAoiAffected > 20 ? "text-amber-600" : "text-emerald-700")}>
                          {rest.totalOverlapHa} ha / {rest.pctOfAoiAffected}% da AOI
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => exportIntersections(aoi, rest)}
                          className="text-xs px-1.5 py-0.5 rounded border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-1">
                          <Download className="size-3" /> Intersecção
                        </button>
                        <button onClick={() => exportRestrictionsWithOverlap(aoi, rest)}
                          className="text-xs px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1">
                          <Download className="size-3" /> Restrição
                        </button>
                      </div>
                    </div>
                    <table className="w-full text-xs border-collapse rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-zinc-50">
                          <th className="text-left p-1.5 border text-zinc-600 font-medium">Feição AOI</th>
                          <th className="text-left p-1.5 border text-zinc-600 font-medium">Restrição</th>
                          <th className="text-right p-1.5 border text-zinc-600 font-medium">Área (ha)</th>
                          <th className="text-right p-1.5 border text-zinc-600 font-medium">% AOI</th>
                          <th className="text-right p-1.5 border text-zinc-600 font-medium">% Restrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.entries.map((e, i) => (
                          <tr key={i} className={e.pctOfAoi > 50 ? "bg-red-50" : e.pctOfAoi > 20 ? "bg-amber-50" : ""}>
                            <td className="p-1.5 border text-zinc-700">{e.aoiFeat}</td>
                            <td className="p-1.5 border text-zinc-700">{e.restrictFeat}</td>
                            <td className="p-1.5 border text-right font-mono text-zinc-700">{e.areaHa}</td>
                            <td className={cn("p-1.5 border text-right font-mono font-bold", e.pctOfAoi>50?"text-red-600":e.pctOfAoi>20?"text-amber-600":"text-emerald-700")}>
                              {e.pctOfAoi}%
                            </td>
                            <td className="p-1.5 border text-right font-mono text-zinc-400">{e.pctOfRestriction}%</td>
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

      {/* ── Save analysis modal ─────────────────────────────── */}
      {saveDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className={cn("rounded-2xl shadow-2xl p-6 w-96 space-y-4", T.modal)}>
            <div className="flex items-center gap-2">
              <Save className={cn("size-4", T.text)} />
              <h3 className={cn("font-semibold", T.text)}>Salvar sobreposição</h3>
            </div>
            <div>
              <label className={cn("block text-xs font-medium mb-1", T.muted)}>Nome da análise</label>
              <input autoFocus value={saveDialog.name}
                onChange={e => setSaveDialog(s => ({ ...s, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && confirmSave()}
                placeholder="Ex: Sobreposição APP – Fazenda Boa Vista"
                className={cn("w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2", T.input)} />
            </div>
            <div>
              <label className={cn("block text-xs font-medium mb-1", T.muted)}>Observações (opcional)</label>
              <textarea value={saveDialog.notes}
                onChange={e => setSaveDialog(s => ({ ...s, notes: e.target.value }))}
                placeholder="Anotações sobre esta sobreposição…"
                rows={3}
                className={cn("w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none", T.input)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSaveDialog({ open: false, name: "", notes: "" })}
                className={cn("px-3 py-1.5 text-sm border rounded-lg", T.btn)}>Cancelar</button>
              <button onClick={confirmSave} disabled={saving || !saveDialog.name.trim()}
                className="px-4 py-1.5 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-40 flex items-center gap-1.5">
                <Save className="size-3.5" /> {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Draw polygon modal ──────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className={cn("rounded-2xl shadow-2xl p-6 w-80 space-y-4", T.modal)}>
            <h3 className={cn("font-semibold flex items-center gap-2", T.text)}>
              <Pencil className="size-4" /> Salvar polígono desenhado
            </h3>
            <input autoFocus value={labelInput} onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveDrawn()}
              placeholder="Nome do polígono…"
              className={cn("w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2", T.input)} />
            <div>
              <p className={cn("text-xs font-medium mb-2", T.muted)}>Tipo de camada</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setNewLayerType("aoi")}
                  className={cn("flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border font-medium transition-colors",
                    newLayerType === "aoi" ? "bg-blue-600 text-white border-blue-600" : T.btn)}>
                  <span className="size-2 rounded-full bg-blue-400" /> AOI
                </button>
                <button onClick={() => setNewLayerType("restriction")}
                  className={cn("flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border font-medium transition-colors",
                    newLayerType === "restriction" ? "bg-red-600 text-white border-red-600" : T.btn)}>
                  <span className="size-2 rounded-full bg-red-400" /> Restrição
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal({ open: false }); drawnGroupRef.current?.clearLayers(); setLabelInput("") }}
                className={cn("px-3 py-1.5 text-sm border rounded-lg", T.btn)}>Cancelar</button>
              <button onClick={saveDrawn} disabled={!labelInput.trim()}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-40 flex items-center gap-1.5">
                <Check className="size-3.5" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SyncBadge ─────────────────────────────────────────────────────────────────

function SyncBadge({ status, onRetry }: { status?: SyncStatus; onRetry: () => void }) {
  if (!status || status === "saved") return (
    <span title="Salvo no banco de dados">
      <CloudCheck className="size-3 text-emerald-500" />
    </span>
  )
  if (status === "saving") return <Loader2 className="size-3 animate-spin text-zinc-400" />
  if (status === "local")  return (
    <span title="Abra a partir de um projeto para salvar">
      <CloudOff className="size-3 text-zinc-400" />
    </span>
  )
  // error
  return (
    <button onClick={onRetry} title="Erro ao salvar — clique para tentar novamente"
      className="flex items-center gap-0.5 text-amber-500 hover:text-amber-600 transition-colors">
      <AlertCircle className="size-3" />
      <RotateCcw   className="size-2.5" />
    </button>
  )
}

// ── LayerRow sub-component ────────────────────────────────────────────────────

type LayerRowT = ReturnType<typeof th>

function LayerRow({
  layer, isDark, T,
  onToggleVisible, onZoom, onExport, onRemove, onSetType, onRename, onRetrySync,
}: {
  layer: MapLayer; isDark: boolean; T: LayerRowT
  onToggleVisible: (v: boolean) => void
  onZoom: () => void
  onExport: () => void
  onRemove: () => void
  onSetType: (t: LayerType) => void
  onRename: (name: string) => void
  onRetrySync: () => void
}) {
  const [editing,  setEditing]  = useState(false)
  const [editName, setEditName] = useState(layer.name)

  const confirmRename = () => {
    if (editName.trim()) onRename(editName.trim())
    setEditing(false)
  }

  return (
    <div className={cn("rounded-lg border p-2 group transition-colors", T.row)}>
      {/* Top row */}
      <div className="flex items-center gap-1.5">

        {/* Visibility toggle */}
        <button onClick={() => onToggleVisible(!layer.visible)} className="shrink-0"
          title={layer.visible ? "Ocultar camada" : "Mostrar camada"}>
          {layer.visible
            ? <Eye    className={cn("size-3.5", T.muted)} />
            : <EyeOff className="size-3.5 text-zinc-300" />}
        </button>

        {/* Color swatch */}
        <span className="size-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: layer.color,
            border: layer.layerType === "restriction" ? "1.5px dashed rgba(0,0,0,0.35)" : "none" }} />

        {/* Name / inline edit */}
        {editing ? (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <input
              autoFocus value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter")  confirmRename()
                if (e.key === "Escape") { setEditing(false); setEditName(layer.name) }
              }}
              className={cn("flex-1 text-xs px-1.5 py-0.5 rounded border min-w-0 focus:outline-none focus:ring-1", T.input)}
            />
            <button onClick={confirmRename} className="text-emerald-500 hover:text-emerald-400 shrink-0">
              <Check className="size-3.5" />
            </button>
          </div>
        ) : (
          <span className={cn("flex-1 truncate text-xs font-medium min-w-0", T.text)} title={layer.name}>
            {layer.name}
          </span>
        )}

        {/* Sync status badge (always visible, small) */}
        <SyncBadge status={layer.syncStatus} onRetry={onRetrySync} />

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!editing && (
            <button onClick={() => { setEditing(true); setEditName(layer.name) }} title="Renomear"
              className={cn("size-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors", T.muted)}>
              <Edit2 className="size-3" />
            </button>
          )}
          <button onClick={onZoom} title="Ir para localização"
            className={cn("size-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors", T.muted)}>
            <Target className="size-3" />
          </button>
          <button onClick={onExport} title="Exportar GeoJSON"
            className={cn("size-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors", T.muted)}>
            <Download className="size-3" />
          </button>
          <button onClick={onRemove} title="Remover camada"
            className="size-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {/* Bottom row: type selector + area */}
      <div className="flex items-center gap-1 mt-1.5 pl-6">
        <button onClick={() => onSetType("aoi")}
          className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors",
            layer.layerType === "aoi"
              ? "bg-blue-600 text-white border-blue-600"
              : isDark
                ? "border-zinc-600 text-zinc-500 hover:border-blue-400 hover:text-blue-400"
                : "border-zinc-200 text-zinc-400 hover:border-blue-300 hover:text-blue-600")}>
          AOI
        </button>
        <button onClick={() => onSetType("restriction")}
          className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors",
            layer.layerType === "restriction"
              ? "bg-red-600 text-white border-red-600"
              : isDark
                ? "border-zinc-600 text-zinc-500 hover:border-red-400 hover:text-red-400"
                : "border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-600")}>
          Restrição
        </button>
        <span className={cn("ml-auto text-[10px] tabular-nums", T.muted)}>
          {layer.totalAreaHa.toLocaleString("pt-BR")} ha
        </span>
      </div>
    </div>
  )
}
