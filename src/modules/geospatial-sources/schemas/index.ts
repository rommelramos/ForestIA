import { z } from "zod"

export const DATA_TYPES = ["vetorial", "raster", "tabular", "api"] as const
export const ACCESS_TYPES = ["api", "download", "web", "wms", "wfs"] as const
export const THEMATIC_CATEGORIES = [
  "vegetação", "uso_solo", "hidrografia", "areas_protegidas",
  "fundiario", "infraestrutura", "clima", "relevo", "limites_administrativos",
] as const

export const geospatialSourceSchema = z.object({
  name: z.string().min(3, "Nome obrigatório"),
  organization: z.string().optional(),
  dataType: z.enum(DATA_TYPES),
  thematicCategory: z.string().optional(),
  reliabilityLevel: z.number().int().min(1).max(5).default(3),
  description: z.string().optional(),
  origin: z.string().optional(),
  updateFrequency: z.string().optional(),
  format: z.string().optional(),
  scale: z.string().optional(),
  crs: z.string().optional(),
  accessType: z.enum(ACCESS_TYPES),
  accessUrl: z.string().optional(),
  applicability: z.string().optional(),
})

export type GeospatialSourceInput = z.infer<typeof geospatialSourceSchema>

export const PUBLIC_SOURCES: GeospatialSourceInput[] = [
  { name: "SICAR — Sistema de Cadastro Ambiental Rural", organization: "SFB / MMA", dataType: "vetorial", thematicCategory: "fundiario", reliabilityLevel: 5, description: "Cadastro de imóveis rurais com polígonos de APP, Reserva Legal e vegetação nativa.", accessType: "api", accessUrl: "https://car.gov.br/api", applicability: "Identificação de imóvel, área total, polígonos de APP e RL, confrontantes.", crs: "SIRGAS2000", format: "GeoJSON/Shapefile" },
  { name: "PRODES — Desmatamento Amazônia (INPE)", organization: "INPE", dataType: "raster", thematicCategory: "vegetação", reliabilityLevel: 5, description: "Monitoramento do desmatamento na Amazônia Legal desde 1988.", accessType: "download", accessUrl: "http://terrabrasilis.dpi.inpe.br", applicability: "Histórico de desmatamento, alertas recentes, passivo ambiental.", updateFrequency: "Anual", format: "Shapefile/GeoTIFF" },
  { name: "MapBiomas — Uso e Cobertura do Solo", organization: "MapBiomas", dataType: "raster", thematicCategory: "uso_solo", reliabilityLevel: 5, description: "Mapeamento anual do uso e cobertura do solo desde 1985.", accessType: "api", accessUrl: "https://plataforma.brasil.mapbiomas.org", applicability: "Análise temporal de vegetação, uso do solo, identificação de antropização.", updateFrequency: "Anual", format: "GeoTIFF/API", crs: "SIRGAS2000" },
  { name: "SIGEF/INCRA — Certificação de Imóveis", organization: "INCRA", dataType: "vetorial", thematicCategory: "fundiario", reliabilityLevel: 5, description: "Certificação de limites de imóveis rurais pelo INCRA.", accessType: "web", accessUrl: "https://sigef.incra.gov.br", applicability: "Regularização fundiária, confrontantes, sobreposição de polígonos.", format: "KMZ/Shapefile" },
  { name: "FUNAI — Terras Indígenas", organization: "FUNAI", dataType: "vetorial", thematicCategory: "areas_protegidas", reliabilityLevel: 5, description: "Delimitação de terras indígenas em diferentes fases.", accessType: "download", accessUrl: "https://funai.gov.br/geoserver", applicability: "Verificação de sobreposição crítica com TIs.", format: "Shapefile", crs: "SIRGAS2000" },
  { name: "ICMBio — Unidades de Conservação", organization: "ICMBio / MMA", dataType: "vetorial", thematicCategory: "areas_protegidas", reliabilityLevel: 5, description: "Limites de unidades de conservação federais, estaduais e municipais.", accessType: "wfs", accessUrl: "https://geoserver.icmbio.gov.br/icmbio/ows", applicability: "Identificação de sobreposição com APAs, RESEXs, PARNAs e demais UCs.", format: "Shapefile/GeoJSON" },
  { name: "ANA — Ottobacias e Rede Hidrográfica", organization: "ANA", dataType: "vetorial", thematicCategory: "hidrografia", reliabilityLevel: 5, description: "Rede hidrográfica nacional em múltiplas escalas.", accessType: "download", accessUrl: "https://dadosabertos.ana.gov.br", applicability: "Delimitação de APPs de cursos d'água, análise de bacia hidrográfica.", format: "Shapefile", crs: "SIRGAS2000" },
  { name: "IBGE — Limites Municipais e Estaduais", organization: "IBGE", dataType: "vetorial", thematicCategory: "limites_administrativos", reliabilityLevel: 5, description: "Malha municipal e estadual do Brasil.", accessType: "download", accessUrl: "https://ibge.gov.br/geociencias", applicability: "Localização do imóvel, jurisdição municipal e estadual.", updateFrequency: "Anual", format: "Shapefile/GeoJSON", crs: "SIRGAS2000" },
  { name: "SEMAS-PA — Base Estadual (Pará)", organization: "SEMAS-PA", dataType: "vetorial", thematicCategory: "areas_protegidas", reliabilityLevel: 4, description: "Bases cartográficas do Estado do Pará: UCs estaduais, assentamentos, áreas embargadas.", accessType: "web", accessUrl: "https://monitoramento.semas.pa.gov.br", applicability: "Sobreposição com áreas protegidas e embargos estaduais no Pará." },
  { name: "IBAMA — Áreas Embargadas", organization: "IBAMA", dataType: "vetorial", thematicCategory: "fundiario", reliabilityLevel: 5, description: "Imóveis com embargo ativo do IBAMA.", accessType: "web", accessUrl: "https://siscom.ibama.gov.br", applicability: "Verificação de passivo ambiental, restrições de financiamento." },
]
