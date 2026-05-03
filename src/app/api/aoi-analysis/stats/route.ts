/**
 * POST /api/aoi-analysis/stats
 *
 * Calculates spectral indices and land-use / land-cover statistics for a
 * GeoJSON polygon.
 *
 * When GEE_SERVICE_ACCOUNT + GEE_PRIVATE_KEY + GEE_PROJECT are configured:
 *   • Spectral indices (NDVI/EVI/SAVI/NDWI/NBR/NDMI) — Sentinel-2 L2A 10 m
 *   • Land-use breakdown — MapBiomas Collection 9, 30 m, year 2023
 * Both queries run in parallel. If MapBiomas fails the indices are still
 * returned (with mock landuse); if the indices fail, everything falls back.
 */
import { NextResponse } from "next/server"
import { fetchGEEStatistics, fetchMapBiomasLandUse } from "@/lib/gee"
import { auth } from "../../../../../auth"

// ── Mock fallback data ─────────────────────────────────────────────────────────
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
  // Require an authenticated session — prevents anyone on the internet from
  // triggering GEE API calls (which are billed to the project quota).
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

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

    // ── GEE path — run spectral indices + MapBiomas in parallel ────────────
    if (hasGEE && body.geojson) {
      const [indicesResult, landuseResult] = await Promise.allSettled([
        fetchGEEStatistics(body.geojson),
        fetchMapBiomasLandUse(body.geojson),
      ])

      // If spectral indices failed, log and fall through to full mock
      if (indicesResult.status === "rejected") {
        console.error("[stats] GEE indices error, falling back to mock:", indicesResult.reason)
      } else {
        // Indices OK — use real or mock landuse depending on MapBiomas result
        const landuseOk = landuseResult.status === "fulfilled"
        if (landuseResult.status === "rejected") {
          console.error("[stats] MapBiomas error, using mock landuse:", landuseResult.reason)
        }

        return NextResponse.json({
          indices:       indicesResult.value,
          landuse:       landuseOk ? landuseResult.value.categories : MOCK_LANDUSE,
          landuseSource: landuseOk ? "mapbiomas" : "mock",
          landuseYear:   landuseOk ? landuseResult.value.year : undefined,
          source:        "gee",
          note:          "Dados reais Sentinel-2 L2A · 10 m · Google Earth Engine · últimos 180 dias.",
        })
      }
    }

    // ── Mock fallback — everything simulated ────────────────────────────────
    const requestedIndices = body.indices ?? Object.keys(MOCK_INDICES)
    const indices: typeof MOCK_INDICES = {}
    for (const id of requestedIndices) {
      if (MOCK_INDICES[id]) indices[id] = MOCK_INDICES[id]
    }

    return NextResponse.json({
      indices,
      landuse:       MOCK_LANDUSE,
      landuseSource: "mock",
      landuseYear:   undefined,
      source:        hasGEE ? "gee-error" : "mock",
      note:          hasGEE
        ? "Erro ao consultar o Google Earth Engine. Verifique GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY e GEE_PROJECT."
        : "Dados simulados. Configure GEE_SERVICE_ACCOUNT + GEE_PRIVATE_KEY + GEE_PROJECT para dados reais.",
    })
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
}
