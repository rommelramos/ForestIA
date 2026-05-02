import { NextResponse } from "next/server"

// ── Mock spectral indices ─────────────────────────────────────────────────────
// Future: integrate with Sentinel Hub Statistics API and MapBiomas GraphQL
const MOCK_INDICES: Record<string, { mean: number; min: number; max: number; unit: string }> = {
  ndvi: { mean: 0.61, min: 0.12, max: 0.89, unit: "" },
  evi:  { mean: 0.42, min: 0.08, max: 0.71, unit: "" },
  savi: { mean: 0.49, min: 0.09, max: 0.78, unit: "" },
  ndwi: { mean: -0.18, min: -0.54, max: 0.31, unit: "" },
  nbr:  { mean: 0.33, min: -0.12, max: 0.68, unit: "" },
  ndmi: { mean: 0.22, min: -0.08, max: 0.51, unit: "" },
}

// ── Mock land use breakdown (Brazilian Forest Code categories) ────────────────
const MOCK_LANDUSE: Record<string, number> = {
  "Vegetação Nativa":                        38.4,
  "Área de Preservação Permanente (APP)":    18.7,
  "Reserva Legal":                           20.1,
  "Área Consolidada":                        12.3,
  "Uso Alternativo do Solo":                  6.8,
  "Recursos Hídricos":                        2.5,
  "Servidão Ambiental":                       1.2,
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      geojson?: unknown
      indices?: string[]
    }

    const requestedIndices = body.indices ?? Object.keys(MOCK_INDICES)

    // Build indices response — only return requested ones
    const indices: Record<string, { mean: number; min: number; max: number; unit: string }> = {}
    for (const id of requestedIndices) {
      if (MOCK_INDICES[id]) indices[id] = MOCK_INDICES[id]
    }

    return NextResponse.json({
      indices,
      landuse: MOCK_LANDUSE,
      source: "mock",
      note: "Dados simulados para demonstração. Configure Sentinel Hub e MapBiomas para dados reais.",
    })
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }
}
