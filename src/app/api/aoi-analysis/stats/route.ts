/**
 * POST /api/aoi-analysis/stats
 *
 * Calculates spectral indices (NDVI / EVI / SAVI / NDWI / NBR / NDMI) and
 * land-use statistics for a GeoJSON polygon.
 *
 * When GEE_SERVICE_ACCOUNT + GEE_PRIVATE_KEY + GEE_PROJECT are configured,
 * returns real Sentinel-2 L2A values via Google Earth Engine (10 m, últimos 90 dias).
 * Otherwise returns realistic mock data for UI demonstration.
 */
import { NextResponse } from "next/server"
import { fetchGEEStatistics } from "@/lib/gee"

// ── Fallback mock data ─────────────────────────────────────────────────────────
const MOCK_INDICES: Record<string, { mean: number; min: number; max: number; unit: string }> = {
  ndvi: { mean: 0.61, min: 0.12, max: 0.89, unit: "" },
  evi:  { mean: 0.42, min: 0.08, max: 0.71, unit: "" },
  savi: { mean: 0.49, min: 0.09, max: 0.78, unit: "" },
  ndwi: { mean: -0.18, min: -0.54, max: 0.31, unit: "" },
  nbr:  { mean: 0.33, min: -0.12, max: 0.68, unit: "" },
  ndmi: { mean: 0.22, min: -0.08, max: 0.51, unit: "" },
}
const MOCK_LANDUSE: Record<string, number> = {
  "Vegetação Nativa":                     38.4,
  "Área de Preservação Permanente (APP)": 18.7,
  "Reserva Legal":                        20.1,
  "Área Consolidada":                     12.3,
  "Uso Alternativo do Solo":               6.8,
  "Recursos Hídricos":                     2.5,
  "Servidão Ambiental":                    1.2,
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      geojson?: GeoJSON.FeatureCollection
      indices?: string[]
    }

    const hasGEE = !!(
      process.env.GEE_SERVICE_ACCOUNT &&
      process.env.GEE_PRIVATE_KEY &&
      process.env.GEE_PROJECT
    )

    // ── Google Earth Engine ─────────────────────────────────────────────────
    if (hasGEE && body.geojson) {
      try {
        const indices = await fetchGEEStatistics(body.geojson)
        return NextResponse.json({
          indices,
          landuse: MOCK_LANDUSE,   // MapBiomas integration: future work
          source:  "gee",
          note:    "Dados reais Sentinel-2 L2A · 10 m · Google Earth Engine · últimos 90 dias.",
        })
      } catch (geeErr) {
        console.error("[stats] GEE error, falling back to mock:", geeErr)
        // Fall through to mock
      }
    }

    // ── Mock fallback ───────────────────────────────────────────────────────
    const requestedIndices = body.indices ?? Object.keys(MOCK_INDICES)
    const indices: Record<string, { mean: number; min: number; max: number; unit: string }> = {}
    for (const id of requestedIndices) {
      if (MOCK_INDICES[id]) indices[id] = MOCK_INDICES[id]
    }

    return NextResponse.json({
      indices,
      landuse: MOCK_LANDUSE,
      source:  hasGEE ? "gee-error" : "mock",
      note:    hasGEE
        ? "Erro ao consultar o Google Earth Engine. Verifique GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY e GEE_PROJECT."
        : "Dados simulados. Configure GEE_SERVICE_ACCOUNT + GEE_PRIVATE_KEY + GEE_PROJECT para dados reais.",
    })
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
}
