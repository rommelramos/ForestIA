/**
 * GET /api/gee/tiles?index=ndvi&source=sentinel2&dateFrom=2024-01-01&dateTo=2024-06-30
 *
 * Generates a GEE mapId and returns a tile URL template that Leaflet can use
 * as an L.tileLayer.
 *
 * Supported sources:
 *   sentinel2 — COPERNICUS/S2_SR_HARMONIZED, 10 m
 *   landsat   — LANDSAT/LC09/C02/T1_L2 + LC08/C02/T1_L2, 30 m
 *
 * Supported indices: ndvi, evi, ndwi, lst
 *
 * Server-side in-memory cache with 20-hour TTL (GEE mapIds expire in ~24h).
 *
 * Required env vars: GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY, GEE_PROJECT
 */

import { NextResponse }            from "next/server"
import { initGEE }                 from "@/lib/gee"
import { GEE_INDEX_CONFIGS, type GeeIndex } from "@/lib/spectral-providers"
import { withErrorHandling }       from "@/lib/api/errors"
import { auth }                    from "../../../../../auth"

// ── Module-level CJS import (earthengine is CommonJS-only) ───────────────────
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
const ee = require("@google/earthengine") as any

// ── In-memory tile cache ──────────────────────────────────────────────────────

interface CacheEntry {
  tileUrl:     string
  attribution: string
  resolution:  string
  expiresAt:   number   // epoch ms
}

// Key: `${source}:${index}:${dateFrom}:${dateTo}`
const _tileCache = new Map<string, CacheEntry>()

const TTL_MS = 20 * 60 * 60 * 1000  // 20 hours

function getCached(key: string): CacheEntry | undefined {
  const entry = _tileCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) { _tileCache.delete(key); return undefined }
  return entry
}

// ── Wrap ee.Image.getMapId in a Promise ───────────────────────────────────────

function getMapIdAsync(
  image: any,
  visParams: Record<string, unknown>,
): Promise<{ mapid: string; token: string; urlFormat?: string }> {
  return new Promise((resolve, reject) => {
    image.getMapId(visParams, (obj: any, err: any) => {
      if (err) reject(new Error(String(err)))
      else     resolve(obj as { mapid: string; token: string; urlFormat?: string })
    })
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export const GET = withErrorHandling(async (req: Request) => {
  // Auth guard
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const index    = (searchParams.get("index")    ?? "ndvi")   as GeeIndex
  const source   = (searchParams.get("source")   ?? "sentinel2") as "sentinel2" | "landsat"
  const dateFrom = searchParams.get("dateFrom") ?? (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().split("T")[0]
  })()
  const dateTo   = searchParams.get("dateTo")   ?? new Date().toISOString().split("T")[0]

  const validIndices: GeeIndex[] = ["ndvi", "evi", "ndwi", "lst"]
  if (!validIndices.includes(index)) {
    return NextResponse.json({ error: `Índice inválido: ${index}` }, { status: 400 })
  }
  if (!["sentinel2", "landsat"].includes(source)) {
    return NextResponse.json({ error: `Fonte inválida: ${source}` }, { status: 400 })
  }

  const cfg = GEE_INDEX_CONFIGS[index]

  // LST is not available for Sentinel-2
  if (index === "lst" && source === "sentinel2") {
    return NextResponse.json({ error: "LST não disponível para Sentinel-2 (sem banda térmica)" }, { status: 400 })
  }

  const cacheKey = `${source}:${index}:${dateFrom}:${dateTo}`
  const cached   = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  // ── GEE auth check ────────────────────────────────────────────────────────
  const hasGEE = !!(
    process.env.GEE_SERVICE_ACCOUNT &&
    process.env.GEE_PRIVATE_KEY     &&
    process.env.GEE_PROJECT
  )
  if (!hasGEE) {
    return NextResponse.json(
      { error: "GEE não configurado. Defina GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY e GEE_PROJECT." },
      { status: 503 },
    )
  }

  await initGEE()

  // ── Build image collection ────────────────────────────────────────────────
  let image: any
  let resolution: string
  let attribution: string

  if (source === "sentinel2") {
    const bandCfg = cfg.s2!
    const col = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterDate(dateFrom, dateTo)
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
      .select(["B2", "B3", "B4", "B8", "B11", "B12", "SCL"])

    const masked = col.map((img: any) => {
      const scl  = img.select("SCL")
      const mask = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7)).or(scl.eq(11))
      return img.select(["B2", "B3", "B4", "B8", "B11", "B12"]).updateMask(mask).divide(10000)
    })
    const median = masked.median()

    if (index === "evi") {
      image = median.expression(
        "2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)",
        { NIR: median.select("B8"), RED: median.select("B4"), BLUE: median.select("B2") },
      )
    } else {
      image = median.normalizedDifference(bandCfg.bands)
    }

    resolution  = "10m"
    attribution = "Sentinel-2 SR · ESA · GEE"

    // vis params
    const vis = bandCfg.vis
    const mapObj = await getMapIdAsync(image, { min: vis.min, max: vis.max, palette: vis.palette })
    const tileUrl = mapObj.urlFormat ??
      `https://earthengine.googleapis.com/map/${mapObj.mapid}/{z}/{x}/{y}?token=${mapObj.token}`

    const entry: CacheEntry = { tileUrl, attribution, resolution, expiresAt: Date.now() + TTL_MS }
    _tileCache.set(cacheKey, entry)
    return NextResponse.json(entry)
  }

  // landsat
  const l8Cfg  = cfg.l8!
  const lc9    = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
  const lc8    = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  const merged = lc9.merge(lc8)
    .filterDate(dateFrom, dateTo)
    .filter(ee.Filter.lt("CLOUD_COVER", 20))

  const scaledCol = merged.map((img: any) =>
    img.select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7", "ST_B10"])
      .multiply(0.0000275).add(-0.2)
  )
  const median = scaledCol.median()

  if (index === "lst") {
    // ST_B10 in Kelvin after scaling
    const stScaled = merged.map((img: any) =>
      img.select("ST_B10").multiply(0.00341802).add(149.0)
    ).median()
    image = stScaled
  } else if (index === "evi") {
    image = median.expression(
      "2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)",
      { NIR: median.select("SR_B5"), RED: median.select("SR_B4"), BLUE: median.select("SR_B2") },
    )
  } else {
    image = median.normalizedDifference(l8Cfg.bands)
  }

  resolution  = "30m"
  attribution = "Landsat 8/9 C2 · USGS · GEE"

  const vis    = l8Cfg.vis
  const mapObj = await getMapIdAsync(image, { min: vis.min, max: vis.max, palette: vis.palette })
  const tileUrl = mapObj.urlFormat ??
    `https://earthengine.googleapis.com/map/${mapObj.mapid}/{z}/{x}/{y}?token=${mapObj.token}`

  const entry: CacheEntry = { tileUrl, attribution, resolution, expiresAt: Date.now() + TTL_MS }
  _tileCache.set(cacheKey, entry)
  return NextResponse.json(entry)
})
