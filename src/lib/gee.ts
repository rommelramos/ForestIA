/**
 * Google Earth Engine — server-side helper.
 *
 * Authenticates via a Google Cloud service account (JSON key split into
 * individual environment variables) and exposes fetchGEEStatistics() to
 * compute NDVI / EVI / SAVI / NDWI / NBR / NDMI for a GeoJSON polygon.
 *
 * Required environment variables:
 *   GEE_SERVICE_ACCOUNT   e.g. forestia@my-project.iam.gserviceaccount.com
 *   GEE_PRIVATE_KEY       -----BEGIN PRIVATE KEY----- (newlines as literal \n)
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
        _initPromise = null       // allow retry after credential fix
        reject(new Error(`GEE authentication failed: ${err}`))
      },
    )
  })

  return _initPromise
}

// ── Numeric safety helper ─────────────────────────────────────────────────────

/**
 * Converts any value from a GEE evaluate() result to a rounded finite number.
 * Handles strings (including "NaN"), null, undefined, and non-numeric objects.
 */
export function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v ?? fallback)
  return isNaN(n) || !isFinite(n) ? fallback : +n.toFixed(3)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type IndexStats = { mean: number; min: number; max: number; unit: string }

export type LandUseResult = {
  categories: Record<string, number>   // category name → percentage (0–100)
  year:       number                   // MapBiomas reference year
  source:     "mapbiomas"
}

// ── MapBiomas Collection 9 — class code → category name ──────────────────────
// Reference: https://mapbiomas.org/codigos-de-legenda
// Groups are intentionally coarser than the full legend to match the
// Forest Code categories shown in the UI.
const MB_CLASS_TO_CATEGORY: Record<number, string> = {
  // ── Floresta Nativa ────────────────────────────────────────────────────────
  3:  "Floresta Nativa",   // Formação Florestal
  4:  "Floresta Nativa",   // Formação Savânica
  5:  "Floresta Nativa",   // Mangue
  6:  "Floresta Nativa",   // Floresta Alagável
  49: "Floresta Nativa",   // Restinga Arborizada

  // ── Vegetação Natural não Florestal ───────────────────────────────────────
  10: "Vegetação Natural",   // Outras Formações Não Florestais
  11: "Vegetação Natural",   // Campo Alagado e Área Pantanosa
  12: "Vegetação Natural",   // Formação Campestre
  32: "Vegetação Natural",   // Apicum
  29: "Vegetação Natural",   // Afloramento Rochoso
  50: "Vegetação Natural",   // Restinga Herbácea
  13: "Vegetação Natural",   // Outras Formações Não Florestais

  // ── Agropecuária ──────────────────────────────────────────────────────────
  14: "Pastagem",   // Agropecuária (genérico)
  15: "Pastagem",   // Pastagem
  21: "Pastagem",   // Mosaico de Usos

  // Lavoura Temporária
  18: "Lavoura Temporária",
  19: "Lavoura Temporária",   // Lavoura Temporária
  39: "Lavoura Temporária",   // Soja
  20: "Lavoura Temporária",   // Cana-de-açúcar
  40: "Lavoura Temporária",   // Arroz
  62: "Lavoura Temporária",   // Algodão
  41: "Lavoura Temporária",   // Outras Lavouras Temporárias

  // Lavoura Perene
  36: "Lavoura Perene",
  46: "Lavoura Perene",   // Café
  47: "Lavoura Perene",   // Citrus
  35: "Lavoura Perene",   // Dendê (Palma de Óleo)
  48: "Lavoura Perene",   // Outras Lavouras Perenes

  // Silvicultura
  9:  "Silvicultura",   // Reflorestamento / Plantio

  // ── Área não Vegetada ──────────────────────────────────────────────────────
  22: "Área Urbana e Mineração",
  24: "Área Urbana e Mineração",   // Área Urbanizada
  30: "Área Urbana e Mineração",   // Mineração
  23: "Área Urbana e Mineração",   // Praia e Duna
  25: "Área Urbana e Mineração",   // Outras Áreas não Vegetadas

  // ── Recursos Hídricos ─────────────────────────────────────────────────────
  26: "Recursos Hídricos",
  33: "Recursos Hídricos",   // Rio, Lago e Oceano
  31: "Recursos Hídricos",   // Aquicultura

  // ── Não Observado ─────────────────────────────────────────────────────────
  27: "Não Observado",
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Wrap ee.ComputedObject.evaluate() in a Promise. */
function evaluate<T>(obj: any): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obj.evaluate((result: any, err: any) => {
      if (err) reject(new Error(String(err)))
      else resolve(result as T)
    })
  })
}

/**
 * Build an EE Geometry from a GeoJSON FeatureCollection.
 * Avoids passing the full FeatureCollection object to ee.FeatureCollection()
 * which can misparse non-standard properties attached to features.
 */
function buildGeometry(geojson: GeoJSON.FeatureCollection): any {
  if (geojson.features.length === 1) {
    // Single feature — construct geometry directly from the GeoJSON geometry
    return ee.Geometry(geojson.features[0].geometry)
  }
  // Multiple features — build individual EE Features then union
  const eeFeatures = geojson.features.map((f) => ee.Feature(ee.Geometry(f.geometry)))
  return ee.FeatureCollection(eeFeatures).geometry()
}

/**
 * Returns a Sentinel-2 SR Harmonized collection filtered to the geometry,
 * with SCL cloud mask applied and reflectances scaled to [0, 1].
 * Tries progressively relaxed cloud-cover thresholds until at least one
 * image is found, then returns both the collection size and the median image.
 */
async function getS2Median(
  geometry: any,
  dateFrom: string,
  dateTo:   string,
): Promise<{ size: number; image: any }> {
  // Only the bands we actually need — avoids "no band named X" from extras
  const BANDS = ["B2", "B3", "B4", "B8", "B11", "B12", "SCL"]

  // Try cloud-cover thresholds in order: start strict, relax progressively.
  // In the Amazon, persistent cloud cover > 30 % is normal.
  const CC_THRESHOLDS = [30, 60, 80]

  for (const maxCC of CC_THRESHOLDS) {
    const col = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterDate(dateFrom, dateTo)
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", maxCC))
      .filterBounds(geometry)
      .select(BANDS)

    const size = await evaluate<number>(col.size())

    if (size > 0) {
      console.log(`[gee] S2 collection: ${size} images (maxCC=${maxCC}%, ${dateFrom}→${dateTo})`)
      const image = col
        .map((img: any) => {
          const scl  = img.select("SCL")
          // SCL valid classes: 4=veg, 5=bare soil, 6=water, 7=unclassified, 11=snow
          const mask = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7)).or(scl.eq(11))
          // Select only spectral bands (drop SCL) before masking + scaling
          return img.select(["B2", "B3", "B4", "B8", "B11", "B12"])
            .updateMask(mask)
            .divide(10000)   // DN → reflectance [0, 1]
        })
        .median()
      return { size, image }
    }
  }

  throw new Error(
    `GEE: nenhuma imagem Sentinel-2 encontrada para o polígono informado no ` +
    `período ${dateFrom} → ${dateTo} (mesmo com cobertura de nuvens ≤ 80 %).`,
  )
}

// ── Core computation ──────────────────────────────────────────────────────────

/**
 * Computes spectral indices for a GeoJSON polygon via GEE.
 *
 * Data source : Sentinel-2 SR Harmonized (COPERNICUS/S2_SR_HARMONIZED), 10 m.
 * Cloud masking: SCL classes 4 / 5 / 6 / 7 / 11 (valid pixels).
 * Time window  : last 180 days; cloud-cover threshold relaxed progressively
 *                (30 % → 60 % → 80 %) until at least one image is found.
 * Statistics   : mean + P10 (min) + P90 (max) via reduceRegion.
 */
export async function fetchGEEStatistics(
  geojson: GeoJSON.FeatureCollection,
): Promise<Record<string, IndexStats>> {
  await initGEE()

  const now  = new Date()
  // 180-day window ensures coverage even in persistently cloudy regions (Amazon)
  const past = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const fmt  = (d: Date) => d.toISOString().split("T")[0]   // "YYYY-MM-DD"

  // ── Geometry ──────────────────────────────────────────────────────────────
  const geometry = buildGeometry(geojson)

  // ── Sentinel-2 median (with progressive cloud relaxation) ─────────────────
  const { image: s2 } = await getS2Median(geometry, fmt(past), fmt(now))

  // ── Spectral indices ──────────────────────────────────────────────────────
  const ndvi = s2.normalizedDifference(["B8", "B4"]).rename("ndvi")

  // EVI: 2.5 × (NIR − RED) / (NIR + 6×RED − 7.5×BLUE + 1)
  const evi = s2.expression(
    "2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)",
    { NIR: s2.select("B8"), RED: s2.select("B4"), BLUE: s2.select("B2") },
  ).rename("evi")

  // SAVI: 1.5 × (NIR − RED) / (NIR + RED + 0.5)
  const savi = s2.expression(
    "1.5 * (NIR - RED) / (NIR + RED + 0.5)",
    { NIR: s2.select("B8"), RED: s2.select("B4") },
  ).rename("savi")

  const ndwi = s2.normalizedDifference(["B3", "B8"]).rename("ndwi")   // water
  const nbr  = s2.normalizedDifference(["B8", "B12"]).rename("nbr")   // burn ratio
  const ndmi = s2.normalizedDifference(["B8", "B11"]).rename("ndmi")  // moisture

  const combined = ndvi.addBands([evi, savi, ndwi, nbr, ndmi])

  // ── Region reduction ──────────────────────────────────────────────────────
  // Output keys for band "ndvi": ndvi_mean, ndvi_p10, ndvi_p90
  const reducer = ee.Reducer.mean().combine(
    ee.Reducer.percentile([10, 90]),
    /* outputPrefix */ null,
    /* sharedInputs */ true,
  )

  const statsExpr = combined.reduceRegion({
    reducer,
    geometry,
    scale:      10,
    maxPixels:  1e9,
    bestEffort: true,   // auto-increase scale if pixel quota exceeded
  })

  const raw = await evaluate<Record<string, number | null>>(statsExpr)
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

// ── MapBiomas land-use computation ────────────────────────────────────────────

/**
 * Returns the land-use / land-cover breakdown for a GeoJSON polygon using the
 * MapBiomas Collection 9 public asset (30 m, year 2023).
 *
 * The asset is publicly accessible to any authenticated GEE service account —
 * no extra MapBiomas credentials are needed.
 *
 * Categories are grouped to align with the Brazilian Forest Code framework:
 *   Floresta Nativa, Vegetação Natural, Pastagem, Lavoura Temporária,
 *   Lavoura Perene, Silvicultura, Área Urbana e Mineração, Recursos Hídricos.
 *
 * NOTE: APP (Área de Preservação Permanente) and Reserva Legal boundaries
 * cannot be derived from LULC data alone — they require spatial analysis
 * with hydrography (river/spring buffers) and the CAR property polygon.
 */
export async function fetchMapBiomasLandUse(
  geojson: GeoJSON.FeatureCollection,
): Promise<LandUseResult> {
  await initGEE()

  const geometry = buildGeometry(geojson)

  const YEAR  = 2023
  const ASSET = "projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1"
  const BAND  = `classification_${YEAR}`

  const img = ee.Image(ASSET).select(BAND)

  // frequencyHistogram returns { "class_code": pixel_count, ... }
  const histExpr = img.reduceRegion({
    reducer:    ee.Reducer.frequencyHistogram(),
    geometry,
    scale:      30,     // MapBiomas native resolution
    maxPixels:  1e9,
    bestEffort: true,
  })

  const raw = await evaluate<Record<string, Record<string, number>>>(histExpr)
  const pixelCounts: Record<string, number> = raw[BAND] ?? {}

  console.log("[gee] MapBiomas pixel counts:", JSON.stringify(pixelCounts))

  const total = Object.values(pixelCounts).reduce((s, n) => s + n, 0)
  if (total === 0) {
    throw new Error("MapBiomas: nenhum pixel encontrado no polígono — verifique se está dentro do Brasil.")
  }

  // Aggregate pixel counts into display categories
  const catCounts: Record<string, number> = {}
  for (const [codeStr, count] of Object.entries(pixelCounts)) {
    const cat = MB_CLASS_TO_CATEGORY[Number(codeStr)] ?? "Outros"
    catCounts[cat] = (catCounts[cat] ?? 0) + count
  }

  // Convert to percentage, sort descending, skip negligible + "Não Observado"
  const categories: Record<string, number> = {}
  const sorted = Object.entries(catCounts).sort(([, a], [, b]) => b - a)
  for (const [cat, count] of sorted) {
    const pct = +((count / total) * 100).toFixed(1)
    if (pct >= 0.1 && cat !== "Não Observado") {
      categories[cat] = pct
    }
  }

  return { categories, year: YEAR, source: "mapbiomas" }
}
