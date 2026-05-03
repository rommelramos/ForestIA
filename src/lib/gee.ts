/**
 * Google Earth Engine — server-side helper.
 *
 * Authenticates via a Google Cloud service account (JSON key split into
 * individual environment variables) and exposes fetchGEEStatistics() to
 * compute NDVI / EVI / SAVI / NDWI / NBR / NDMI for a GeoJSON polygon.
 *
 * Required environment variables:
 *   GEE_SERVICE_ACCOUNT   e.g. forestia@my-project.iam.gserviceaccount.com
 *   GEE_PRIVATE_KEY       -----BEGIN RSA PRIVATE KEY----- (newlines as literal \n)
 *   GEE_PROJECT           Google Cloud project ID registered with Earth Engine
 *
 * The @google/earthengine package is CommonJS-only. It must be listed in
 * next.config serverExternalPackages to avoid bundling issues.
 */

// ── Module import (CJS-only) ──────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
const ee = require("@google/earthengine") as any

// ── Init singleton ────────────────────────────────────────────────────────────

/** One init Promise per Node.js process (warm Lambda reuse). */
let _initPromise: Promise<void> | null = null

export function initGEE(): Promise<void> {
  if (_initPromise) return _initPromise

  _initPromise = new Promise<void>((resolve, reject) => {
    const credentials = {
      type:         "service_account",
      project_id:   process.env.GEE_PROJECT!,
      // .env stores private key with literal \n — restore real newlines
      private_key:  process.env.GEE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      client_email: process.env.GEE_SERVICE_ACCOUNT!,
      token_uri:    "https://oauth2.googleapis.com/token",
    }

    ee.data.authenticateViaPrivateKey(
      credentials,
      () => {
        ee.initialize(
          /* opt_baseurl */ null,
          /* opt_tileurl */ null,
          /* successFn  */ () => resolve(),
          /* failureFn  */ (err: unknown) =>
            reject(new Error(`GEE initialize failed: ${err}`)),
        )
      },
      (err: unknown) => {
        _initPromise = null          // allow retry on config fix
        reject(new Error(`GEE authentication failed: ${err}`))
      },
    )
  })

  return _initPromise
}

// ── Numeric safety helper ─────────────────────────────────────────────────────

/**
 * Converts any value from an API response to a rounded finite number.
 * Handles strings (including "NaN"), null, undefined, and non-numeric objects.
 */
export function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v ?? fallback)
  return isNaN(n) || !isFinite(n) ? fallback : +n.toFixed(3)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type IndexStats = { mean: number; min: number; max: number; unit: string }

// ── Core computation ──────────────────────────────────────────────────────────

/**
 * Computes spectral indices for a GeoJSON polygon via GEE.
 *
 * Data source: Sentinel-2 SR Harmonized (COPERNICUS/S2_SR_HARMONIZED), 10 m.
 * Cloud masking: SCL classes 4 / 5 / 6 / 7 / 11 kept as valid pixels.
 * Time window: last 90 days, cloud cover ≤ 30 %.
 * Statistics: mean + P10 (min) + P90 (max) via reduceRegion.
 */
export async function fetchGEEStatistics(
  geojson: GeoJSON.FeatureCollection,
): Promise<Record<string, IndexStats>> {
  await initGEE()

  const now  = new Date()
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const fmt  = (d: Date) => d.toISOString().split("T")[0]   // "YYYY-MM-DD"

  // ── Geometry ──────────────────────────────────────────────────────────────
  // ee.FeatureCollection accepts a GeoJSON object directly; .geometry() unions
  // all features so multi-polygon AOIs are handled transparently.
  const fc       = ee.FeatureCollection(geojson)
  const geometry = fc.geometry()

  // ── Sentinel-2 SR Harmonized with SCL cloud mask ──────────────────────────
  const s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") as any)
    .filterDate(fmt(past), fmt(now))
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
    .filterBounds(geometry)
    .map((img: any) => {
      const scl  = img.select("SCL")
      // Keep: 4 = vegetation, 5 = bare soil, 6 = water, 7 = unclassified, 11 = snow/ice
      const mask = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7)).or(scl.eq(11))
      return img.updateMask(mask).divide(10000)   // DN → reflectance [0, 1]
    })
    .median()

  // ── Spectral indices ──────────────────────────────────────────────────────
  const ndvi = s2.normalizedDifference(["B8", "B4"]).rename("ndvi")

  // EVI: 2.5 × (NIR − RED) / (NIR + 6×RED − 7.5×BLUE + 1)
  const evi = s2.expression(
    "2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)",
    { NIR: s2.select("B8"), RED: s2.select("B4"), BLUE: s2.select("B2") },
  ).rename("evi")

  // SAVI: ((NIR − RED) / (NIR + RED + 0.5)) × 1.5
  const savi = s2.expression(
    "1.5 * (NIR - RED) / (NIR + RED + 0.5)",
    { NIR: s2.select("B8"), RED: s2.select("B4") },
  ).rename("savi")

  const ndwi = s2.normalizedDifference(["B3", "B8"]).rename("ndwi")   // water
  const nbr  = s2.normalizedDifference(["B8", "B12"]).rename("nbr")   // burn ratio
  const ndmi = s2.normalizedDifference(["B8", "B11"]).rename("ndmi")  // moisture

  const combined = ndvi.addBands([evi, savi, ndwi, nbr, ndmi])

  // ── Region reduction ──────────────────────────────────────────────────────
  // Combined reducer: mean() + percentile([10,90]) with shared inputs.
  // Output keys for band "ndvi": ndvi_mean, ndvi_p10, ndvi_p90
  const reducer = (ee.Reducer.mean() as any).combine(
    ee.Reducer.percentile([10, 90]),
    /* outputPrefix */ null,
    /* sharedInputs */ true,
  )

  const statsExpr = combined.reduceRegion({
    reducer,
    geometry,
    scale:      10,
    maxPixels:  1e9,
    bestEffort: true,   // automatically increase scale if quota exceeded
  })

  // evaluate() serialises the expression and sends it to GEE servers.
  const raw = await new Promise<Record<string, number | null>>(
    (resolve, reject) => {
      statsExpr.evaluate((result: any, err: any) => {
        if (err) reject(new Error(`GEE evaluate error: ${err}`))
        else resolve(result as Record<string, number | null>)
      })
    },
  )

  console.log("[gee] reduceRegion raw:", JSON.stringify(raw))

  // ── Map to { mean, min, max } ─────────────────────────────────────────────
  const indices: Record<string, IndexStats> = {}
  for (const id of ["ndvi", "evi", "savi", "ndwi", "nbr", "ndmi"]) {
    indices[id] = {
      mean: safeNum(raw[`${id}_mean`]),
      min:  safeNum(raw[`${id}_p10`]),
      max:  safeNum(raw[`${id}_p90`]),
      unit: "",
    }
  }
  return indices
}
