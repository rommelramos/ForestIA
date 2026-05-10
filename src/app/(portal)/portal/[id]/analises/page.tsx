import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, satelliteAnalyses, layerOverlaps, aoiAnalyses, geospatialSources } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { PortalTabs } from "@/components/portal/PortalTabs"
import { CheckCircle2, Leaf } from "lucide-react"
import { count } from "drizzle-orm"
import { projectMessages } from "@/lib/db/schema"
import Link from "next/link"

export const dynamic = "force-dynamic"

const VEGETATION_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  dense:    { label: "Vegetação densa",     desc: "Cobertura florestal excelente",       color: "oklch(0.45 0.13 155)" },
  moderate: { label: "Vegetação moderada",  desc: "Cobertura florestal em bom estado",   color: "oklch(0.60 0.13 130)" },
  sparse:   { label: "Vegetação esparsa",   desc: "Cobertura florestal reduzida",         color: "oklch(0.70 0.13 75)"  },
  degraded: { label: "Degradado",           desc: "Área com sinais de degradação",        color: "oklch(0.65 0.14 25)"  },
  water:    { label: "Corpos d'água",       desc: "Área com presença de água",            color: "oklch(0.55 0.13 230)" },
}

export default async function PortalAnalisesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params
  const projectId = parseInt(id, 10)
  if (isNaN(projectId)) notFound()

  const userId = session.user.id!
  const db = getDb()

  const [project] = await db.select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) notFound()

  const isMember = await db.select({ id: projectMembers.id }).from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1)
  if (project.clientId !== userId && isMember.length === 0) redirect("/portal")

  // Última análise de satélite
  const [latestSat] = await db.select().from(satelliteAnalyses)
    .where(eq(satelliteAnalyses.projectId, projectId))
    .orderBy(satelliteAnalyses.createdAt)
    .limit(1)

  // Sobreposições detectadas
  const aois = await db.select({ id: aoiAnalyses.id }).from(aoiAnalyses)
    .where(eq(aoiAnalyses.projectId, projectId))
  const aoiIds = aois.map(a => a.id)

  const overlaps = aoiIds.length > 0
    ? await db.select({
        id: layerOverlaps.id,
        overlapType: layerOverlaps.overlapType,
        overlapAreaHa: layerOverlaps.overlapAreaHa,
        overlapPercent: layerOverlaps.overlapPercent,
        isCritical: layerOverlaps.isCritical,
        sourceName: geospatialSources.name,
        sourceCategory: geospatialSources.thematicCategory,
      })
      .from(layerOverlaps)
      .leftJoin(geospatialSources, eq(layerOverlaps.sourceId, geospatialSources.id))
      .where(eq(layerOverlaps.aoiAnalysisId, aoiIds[0]))
    : []

  const critical = overlaps.filter(o => o.isCritical)
  const warning  = overlaps.filter(o => !o.isCritical && Number(o.overlapPercent) > 5)
  const ok       = overlaps.filter(o => !o.isCritical && Number(o.overlapPercent) <= 5)

  const [{ unread }] = await db.select({ unread: count() }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.isReadByClient, false)))

  const vegCfg = latestSat?.vegetationClass
    ? VEGETATION_LABELS[latestSat.vegetationClass] ?? null
    : null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.58 0.05 155)" }}>
        <Link href="/portal" className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>Projetos</Link>
        <span>/</span>
        <Link href={`/portal/${projectId}`} className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>
          {project.name}
        </Link>
        <span>/</span>
        <span style={{ color: "oklch(0.25 0.05 155)" }}>Análises</span>
      </div>

      <PortalTabs projectId={projectId} unreadMessages={unread} />

      {/* NDVI card */}
      {latestSat ? (
        <div className="rounded-2xl p-6"
             style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: "oklch(0.45 0.13 155 / 12%)", border: "1px solid oklch(0.55 0.13 155 / 25%)" }}>
              <Leaf className="size-5" style={{ color: "oklch(0.45 0.13 155)" }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
                Saúde da vegetação
              </h2>
              <p className="text-xs" style={{ color: "oklch(0.52 0.04 155)" }}>
                Imagem Sentinel-2 · {latestSat.imageDate
                  ? new Date(latestSat.imageDate).toLocaleDateString("pt-BR")
                  : "Data indisponível"}
              </p>
            </div>
          </div>

          {vegCfg && (
            <div className="mb-4 p-3 rounded-xl"
                 style={{ background: `${vegCfg.color}12`, border: `1px solid ${vegCfg.color}30` }}>
              <p className="font-semibold text-sm" style={{ color: vegCfg.color }}>{vegCfg.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.48 0.04 155)" }}>{vegCfg.desc}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "NDVI", value: latestSat.ndvi, desc: "Índice de vegetação" },
              { label: "EVI",  value: latestSat.evi,  desc: "Vegetação aprimorada" },
              { label: "NDWI", value: latestSat.ndwi, desc: "Índice de água" },
            ].map(({ label, value, desc }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                   style={{ background: "oklch(0.97 0.005 155)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
                  {value ? Number(value).toFixed(2) : "—"}
                </p>
                <p className="text-xs font-semibold" style={{ color: "oklch(0.48 0.08 155)" }}>{label}</p>
                <p className="text-[10px]" style={{ color: "oklch(0.60 0.03 155)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-8 text-center"
             style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
          <Leaf className="size-8 mx-auto mb-3" style={{ color: "oklch(0.72 0.04 155)" }} />
          <p className="text-sm font-medium" style={{ color: "oklch(0.38 0.06 155)" }}>
            Análise de satélite em andamento
          </p>
          <p className="text-xs mt-1" style={{ color: "oklch(0.58 0.04 155)" }}>
            Os índices espectrais serão exibidos assim que a análise for concluída.
          </p>
        </div>
      )}

      {/* Overlaps */}
      <div className="rounded-2xl p-6"
           style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
        <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
          Áreas com restrição
        </h2>

        {overlaps.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl"
               style={{ background: "oklch(0.55 0.13 155 / 8%)", border: "1px solid oklch(0.55 0.13 155 / 20%)" }}>
            <CheckCircle2 className="size-5 shrink-0" style={{ color: "oklch(0.45 0.13 155)" }} />
            <p className="text-sm" style={{ color: "oklch(0.30 0.08 155)" }}>
              {aois.length === 0
                ? "Nenhuma área de interesse cadastrada ainda."
                : "Nenhuma sobreposição com áreas restritivas detectada."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {critical.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "oklch(0.65 0.14 25 / 12%)", color: "oklch(0.48 0.14 25)", border: "1px solid oklch(0.65 0.14 25 / 25%)" }}>
                  ⛔ {critical.length} crítica{critical.length > 1 ? "s" : ""}
                </span>
              )}
              {warning.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "oklch(0.75 0.13 75 / 12%)", color: "oklch(0.52 0.12 75)", border: "1px solid oklch(0.75 0.13 75 / 25%)" }}>
                  ⚠️ {warning.length} atenção
                </span>
              )}
              {ok.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "oklch(0.55 0.13 155 / 10%)", color: "oklch(0.42 0.12 155)", border: "1px solid oklch(0.55 0.13 155 / 22%)" }}>
                  ✓ {ok.length} sem impacto significativo
                </span>
              )}
            </div>

            {overlaps.map(o => {
              const isCrit = o.isCritical
              const isWarn = !o.isCritical && Number(o.overlapPercent) > 5
              const dotColor = isCrit
                ? "oklch(0.65 0.14 25)"
                : isWarn ? "oklch(0.75 0.13 75)" : "oklch(0.55 0.13 155)"

              return (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: "oklch(0.97 0.005 155)", border: "1px solid oklch(0.90 0.015 155 / 50%)" }}>
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "oklch(0.20 0.04 155)" }}>
                      {o.sourceName ?? o.overlapType ?? "Área restritiva"}
                    </p>
                    {o.sourceCategory && (
                      <p className="text-xs" style={{ color: "oklch(0.56 0.04 155)" }}>{o.sourceCategory}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: "oklch(0.20 0.04 155)" }}>
                      {o.overlapAreaHa ? `${Number(o.overlapAreaHa).toFixed(1)} ha` : "—"}
                    </p>
                    <p className="text-xs" style={{ color: "oklch(0.56 0.04 155)" }}>
                      {o.overlapPercent ? `${Number(o.overlapPercent).toFixed(1)}% da AOI` : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
