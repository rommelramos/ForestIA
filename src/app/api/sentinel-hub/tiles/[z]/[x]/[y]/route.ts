/**
 * GET /api/sentinel-hub/tiles/{z}/{x}/{y}?index=ndvi&date=2024-01-01
 *
 * Server-side proxy for Sentinel Hub Process API.
 * Keeps OAuth2 credentials out of the browser.
 *
 * Required env vars:
 *   SENTINEL_HUB_CLIENT_ID
 *   SENTINEL_HUB_CLIENT_SECRET
 *
 * The route converts tile XYZ coords to a WGS-84 bounding box, then
 * calls the Sentinel Hub Process API to fetch a rendered PNG tile.
 *
 * Supported indices: ndvi, evi, ndwi, lst (lst returns an error — no S2 thermal)
 */

import { NextResponse }      from "next/server"
import { withErrorHandling } from "@/lib/api/errors"
import { GEE_INDEX_CONFIGS, type GeeIndex } from "@/lib/spectral-providers"
import { auth }              from "../../../../../../../../auth"

// ── OAuth2 token cache ────────────────────────────────────────────────────────

interface TokenEntry {
  accessToken: string
  expiresAt:   number  // epoch ms
}

let _shToken: TokenEntry | null = null

async function getShToken(): Promise<string> {
  if (_shToken && Date.now() < _shToken.expiresAt - 30_000) {
    return _shToken.accessToken
  }

  const clientId     = process.env.SENTINEL_HUB_CLIENT_ID!
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET!

  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     clientId,
    client_secret: clientSecret,
  })

  const res = await fetch("https://services.sentinel-hub.com/oauth/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sentinel Hub OAuth failed (${res.status}): ${text}`)
  }

  const json = await res.json() as { access_token: string; expires_in: number }
  _shToken = {
    accessToken: json.access_token,
    expiresAt:   Date.now() + json.expires_in * 1000,
  }
  return _shToken.accessToken
}

// ── Tile XYZ → WGS-84 BBox ────────────────────────────────────────────────────

function tileToBBox(z: number, x: number, y: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return {
    west:  (x / Math.pow(2, z)) * 360 - 180,
    east:  ((x + 1) / Math.pow(2, z)) * 360 - 180,
    north: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    south: (180 / Math.PI) * Math.atan(
      Math.sinh(Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z)),
    ),
  }
}

// ── Evalscripts per index ─────────────────────────────────────────────────────

const EVALSCRIPTS: Record<string, string> = {
  ndvi: `
//VERSION=3
function setup() {
  return { input: ["B04","B08","dataMask"], output: { bands: 4 } }
}
function evaluatePixel(s) {
  const ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 1e-10)
  const c = colorBlend(ndvi, [-0.2, 0.0, 0.2, 0.4, 0.7, 0.9],
    [[139,0,0],[255,69,0],[255,255,0],[144,238,144],[34,139,34],[0,100,0]])
  return [c[0]/255, c[1]/255, c[2]/255, s.dataMask]
}`,

  evi: `
//VERSION=3
function setup() {
  return { input: ["B02","B04","B08","dataMask"], output: { bands: 4 } }
}
function evaluatePixel(s) {
  const evi = 2.5 * (s.B08 - s.B04) / (s.B08 + 6.0*s.B04 - 7.5*s.B02 + 1.0 + 1e-10)
  const c = colorBlend(evi, [-0.2, 0.0, 0.2, 0.4, 0.7, 0.9],
    [[139,0,0],[255,69,0],[255,255,0],[50,205,50],[34,139,34],[0,100,0]])
  return [c[0]/255, c[1]/255, c[2]/255, s.dataMask]
}`,

  ndwi: `
//VERSION=3
function setup() {
  return { input: ["B03","B08","dataMask"], output: { bands: 4 } }
}
function evaluatePixel(s) {
  const ndwi = (s.B03 - s.B08) / (s.B03 + s.B08 + 1e-10)
  const c = colorBlend(ndwi, [-1, -0.3, 0, 0.3, 1],
    [[139,69,19],[222,184,135],[255,255,255],[135,206,235],[0,0,139]])
  return [c[0]/255, c[1]/255, c[2]/255, s.dataMask]
}`,
}

// ── Route handler ─────────────────────────────────────────────────────────────

export const GET = withErrorHandling(async (
  req: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) => {
  // Auth guard
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const hasCredentials = !!(
    process.env.SENTINEL_HUB_CLIENT_ID &&
    process.env.SENTINEL_HUB_CLIENT_SECRET
  )
  if (!hasCredentials) {
    return NextResponse.json(
      { error: "Sentinel Hub não configurado. Defina SENTINEL_HUB_CLIENT_ID e SENTINEL_HUB_CLIENT_SECRET." },
      { status: 503 },
    )
  }

  const { z: zStr, x: xStr, y: yStr } = await context.params
  const z = parseInt(zStr, 10)
  const x = parseInt(xStr, 10)
  const y = parseInt(yStr, 10)

  if (isNaN(z) || isNaN(x) || isNaN(y)) {
    return NextResponse.json({ error: "Coordenadas de tile inválidas" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const index = (searchParams.get("index") ?? "ndvi") as GeeIndex
  const date  = searchParams.get("date")  ?? new Date().toISOString().split("T")[0]

  const evalscript = EVALSCRIPTS[index]
  if (!evalscript) {
    return NextResponse.json({ error: `Índice não suportado no Sentinel Hub: ${index}` }, { status: 400 })
  }

  const cfg = GEE_INDEX_CONFIGS[index]
  if (!cfg.shLayer) {
    return NextResponse.json({ error: `Índice ${index} não disponível no Sentinel Hub` }, { status: 400 })
  }

  const bbox  = tileToBBox(z, x, y)
  const token = await getShToken()

  // Compute a 6-month window ending at `date`
  const dateTo   = date
  const dateFrom = (() => {
    const d = new Date(date); d.setMonth(d.getMonth() - 6); return d.toISOString().split("T")[0]
  })()

  const payload = {
    input: {
      bounds: {
        bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange:           { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
          maxCloudCoverage:    30,
          mosaickingOrder:     "leastCC",
        },
      }],
    },
    output: {
      width:  256,
      height: 256,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript,
  }

  const shRes = await fetch("https://services.sentinel-hub.com/api/v1/process", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!shRes.ok) {
    const text = await shRes.text()
    console.error(`[sentinel-hub/tiles] Process API error (${shRes.status}):`, text)
    return new Response(null, { status: shRes.status })
  }

  const imgBuf = await shRes.arrayBuffer()
  return new Response(imgBuf, {
    headers: {
      "Content-Type":  "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  })
})
