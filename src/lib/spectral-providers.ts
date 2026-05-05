/**
 * Spectral tile provider definitions for ForestIA.
 *
 * Four providers are supported:
 *   modis        — NASA GIBS WMS (no auth, current behaviour)
 *   landsat      — Landsat 8/9 via GEE mapId tiles
 *   sentinel2    — Sentinel-2 10 m via GEE mapId tiles
 *   sentinel-hub — Copernicus / Sentinel Hub via server-side proxy
 */

// ── Provider metadata ─────────────────────────────────────────────────────────

export type ProviderKey = "modis" | "landsat" | "sentinel2" | "sentinel-hub"

export interface ProviderMeta {
  key:          ProviderKey
  label:        string
  sublabel:     string
  resolution:   string
  revisit:      string
  color:        string   // Tailwind colour name (chip accent)
  requiresGEE?: boolean
  requiresSH?:  boolean
}

export const PROVIDERS: ProviderMeta[] = [
  {
    key:        "modis",
    label:      "MODIS",
    sublabel:   "NASA GIBS",
    resolution: "250m–1km",
    revisit:    "1–2 dias",
    color:      "zinc",
  },
  {
    key:        "landsat",
    label:      "Landsat 8/9",
    sublabel:   "USGS · GEE",
    resolution: "30 m",
    revisit:    "16 dias",
    color:      "amber",
    requiresGEE: true,
  },
  {
    key:        "sentinel2",
    label:      "Sentinel-2",
    sublabel:   "ESA · GEE",
    resolution: "10 m",
    revisit:    "5 dias",
    color:      "emerald",
    requiresGEE: true,
  },
  {
    key:        "sentinel-hub",
    label:      "Sentinel Hub",
    sublabel:   "Copernicus · WMS",
    resolution: "10 m",
    revisit:    "5 dias",
    color:      "blue",
    requiresSH: true,
  },
]

// ── GEE index configuration ───────────────────────────────────────────────────

export type GeeIndex = "ndvi" | "evi" | "ndwi" | "lst"

export interface GeeIndexConfig {
  s2?: {
    bands: [string, string]
    vis:   { min: number; max: number; palette: string[] }
  }
  l8?: {
    bands: [string, string]
    vis:   { min: number; max: number; palette: string[] }
  }
  /** Sentinel Hub layer name (empty string = not available) */
  shLayer:            string
  supportedProviders: ProviderKey[]
}

export const GEE_INDEX_CONFIGS: Record<GeeIndex, GeeIndexConfig> = {
  ndvi: {
    s2: {
      bands: ["B8", "B4"],
      vis:   { min: -0.2, max: 0.9, palette: ["#8B0000", "#FF4500", "#FFFF00", "#90EE90", "#006400"] },
    },
    l8: {
      bands: ["SR_B5", "SR_B4"],
      vis:   { min: -0.2, max: 0.9, palette: ["#8B0000", "#FF4500", "#FFFF00", "#90EE90", "#006400"] },
    },
    shLayer:            "NDVI",
    supportedProviders: ["modis", "landsat", "sentinel2", "sentinel-hub"],
  },
  evi: {
    s2: {
      bands: ["B8", "B4"],
      vis:   { min: -0.2, max: 0.9, palette: ["#8B0000", "#FF4500", "#FFFF00", "#32CD32", "#006400"] },
    },
    l8: {
      bands: ["SR_B5", "SR_B4"],
      vis:   { min: -0.2, max: 0.9, palette: ["#8B0000", "#FF4500", "#FFFF00", "#32CD32", "#006400"] },
    },
    shLayer:            "EVI",
    supportedProviders: ["modis", "landsat", "sentinel2", "sentinel-hub"],
  },
  ndwi: {
    s2: {
      bands: ["B3", "B8"],
      vis:   { min: -1, max: 1, palette: ["#8B4513", "#DEB887", "#FFFFFF", "#87CEEB", "#00008B"] },
    },
    l8: {
      bands: ["SR_B3", "SR_B5"],
      vis:   { min: -1, max: 1, palette: ["#8B4513", "#DEB887", "#FFFFFF", "#87CEEB", "#00008B"] },
    },
    shLayer:            "NDWI",
    supportedProviders: ["modis", "landsat", "sentinel2", "sentinel-hub"],
  },
  lst: {
    // LST is only available from MODIS and Landsat — Sentinel-2 has no thermal band
    l8: {
      bands: ["ST_B10", "ST_B10"],
      vis:   { min: 270, max: 330, palette: ["#313695", "#74ADD1", "#FEE090", "#F46D43", "#A50026"] },
    },
    shLayer:            "",   // not available in SH for S2
    supportedProviders: ["modis", "landsat"],
  },
}
