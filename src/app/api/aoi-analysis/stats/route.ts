/**
 * POST /api/aoi-analysis/stats
 *
 * Calculates spectral indices and land-use statistics for a GeoJSON polygon.
 *
 * When SENTINEL_HUB_CLIENT_ID + SENTINEL_HUB_CLIENT_SECRET are set, the
 * endpoint calls the Sentinel Hub Statistics API v3 (Sentinel-2 L2A, 10 m)
 * to return real NDVI / EVI / SAVI / NDWI / NBR / NDMI values.
 *
 * Otherwise returns realistic mock data for UI demonstration.
 */
import { NextResponse } from "next/server"

// ── Evalscript (Sentinel Hub) ──────────────────────────────────────────────────
// Outputs 6 single-band float32 layers — one per spectral index.
// SCL (Scene Classification Layer) is used to mask clouds, cloud shadows,
// snow and saturated pixels before computing statistics.
const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02","B03","B04","B08","B8A","B11","B12","SCL"] }],
    output: [
      { id: "ndvi",     bands: 1, sampleType: "FLOAT32" },
      { id: "evi",      bands: 1, sampleType: "FLOAT32" },
      { id: "savi",     bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi",     bands: 1, sampleType: "FLOAT32" },
      { id: "nbr",      bands: 1, sampleType: "FLOAT32" },
      { id: "ndmi",     bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8"   }
    ]
  };
}
function evaluatePixel(s) {
  // SCL classes: 4=vegetation, 5=bare soil, 6=water, 7=unclassified → valid
  const valid = [4,5,6,7,11].includes(s.SCL) ? 1 : 0;
  const eps = 0.0001;
  const ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + eps);
  const evi  = 2.5 * (s.B08 - s.B04) / (s.B08 + 6*s.B04 - 7.5*s.B02 + 1 + eps);
  const savi = 1.5 * (s.B08 - s.B04) / (s.B08 + s.B04 + 0.5 + eps);
  const ndwi = (s.B03 - s.B08) / (s.B03 + s.B08 + eps);
  const nbr  = (s.B08 - s.B12) / (s.B08 + s.B12 + eps);
  const ndmi = (s.B08 - s.B11) / (s.B08 + s.B11 + eps);
  return {
    ndvi:     [ndvi],
    evi:      [evi],
    savi:     [savi],
    ndwi:     [ndwi],
    nbr:      [nbr],
    ndmi:     [ndmi],
    dataMask: [valid],
  };
}`

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

// ── Sentinel Hub OAuth2 token ──────────────────────────────────────────────────
async function getSHToken(): Promise<string> {
  const clientId     = process.env.SENTINEL_HUB_CLIENT_ID!
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET!
  const res = await fetch(
    "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    },
  )
  if (!res.ok) throw new Error(`SH token error ${res.status}: ${await res.text()}`)
  const json = await res.json() as { access_token: string }
  return json.access_token
}

// ── Sentinel Hub Statistics API ────────────────────────────────────────────────
async function fetchSHStatistics(
  token:   string,
  geojson: GeoJSON.FeatureCollection,
): Promise<Record<string, { mean: number; min: number; max: number; unit: string }>> {
  const now  = new Date()
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // last 90 days

  // Use the union geometry if there are multiple features
  const geometry = geojson.features.length === 1
    ? geojson.features[0].geometry
    : { type: "GeometryCollection", geometries: geojson.features.map(f => f.geometry) }

  const body = {
    input: {
      bounds: {
        geometry,
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: {
            from: past.toISOString(),
            to:   now.toISOString(),
          },
          maxCloudCoverage: 30,
        },
      }],
    },
    aggregation: {
      timeRange: {
        from: past.toISOString(),
        to:   now.toISOString(),
      },
      aggregationInterval: { of: "P30D" },  // monthly bins
      evalscript:          EVALSCRIPT,
      resx:                10,
      resy:                10,
    },
    calculations: {
      ndvi: { statistics: { default: { percentiles: { k: [10, 50, 90] } } } },
      evi:  { statistics: { default: { percentiles: { k: [10, 50, 90] } } } },
      savi: { statistics: { default: { percentiles: { k: [10, 50, 90] } } } },
      ndwi: { statistics: { default: { percentiles: { k: [10, 50, 90] } } } },
      nbr:  { statistics: { default: { percentiles: { k: [10, 50, 90] } } } },
      ndmi: { statistics: { default: { percentiles: { k: [10, 50, 90] } } } },
    },
  }

  const res = await fetch("https://services.sentinel-hub.com/api/v1/statistics", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`SH Statistics error ${res.status}: ${await res.text()}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as { data: any[] }
  const indices: Record<string, { mean: number; min: number; max: number; unit: string }> = {}

  // Aggregate statistics across time intervals (take the median interval)
  const intervals = data.data ?? []
  if (intervals.length === 0) throw new Error("SH returned no data intervals")

  // Use the interval with the most valid pixels (highest percentile count)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const best = intervals.reduce((a: any, b: any) => {
    const aCount = a.outputs?.ndvi?.bands?.B0?.stats?.sampleCount ?? 0
    const bCount = b.outputs?.ndvi?.bands?.B0?.stats?.sampleCount ?? 0
    return bCount > aCount ? b : a
  })

  for (const indexId of ["ndvi","evi","savi","ndwi","nbr","ndmi"]) {
    const stats = best?.outputs?.[indexId]?.bands?.B0?.stats
    if (!stats) continue
    indices[indexId] = {
      mean: +(stats.mean ?? 0).toFixed(3),
      min:  +(stats.percentiles?.["10.0"] ?? stats.min ?? 0).toFixed(3),
      max:  +(stats.percentiles?.["90.0"] ?? stats.max ?? 0).toFixed(3),
      unit: "",
    }
  }
  return indices
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      geojson?: GeoJSON.FeatureCollection
      indices?: string[]
    }

    const hasSHCredentials =
      !!process.env.SENTINEL_HUB_CLIENT_ID &&
      !!process.env.SENTINEL_HUB_CLIENT_SECRET

    // ── Real data via Sentinel Hub ──────────────────────────────────────────
    if (hasSHCredentials && body.geojson) {
      try {
        const token   = await getSHToken()
        const indices = await fetchSHStatistics(token, body.geojson)

        return NextResponse.json({
          indices,
          landuse: MOCK_LANDUSE,   // MapBiomas integration: future work
          source:  "sentinel-hub",
          note:    "Dados reais Sentinel-2 L2A via Sentinel Hub Statistics API.",
        })
      } catch (shErr) {
        console.error("[stats] Sentinel Hub error, falling back to mock:", shErr)
        // Fall through to mock response
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
      source:  hasSHCredentials ? "sentinel-hub-error" : "mock",
      note:    hasSHCredentials
        ? "Erro ao consultar Sentinel Hub. Verifique as credenciais e tente novamente."
        : "Dados simulados. Configure SENTINEL_HUB_CLIENT_ID e SENTINEL_HUB_CLIENT_SECRET para dados reais.",
    })
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
}
