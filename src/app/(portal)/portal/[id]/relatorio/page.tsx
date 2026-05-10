import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, viabilityReports, projectMessages } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { PortalTabs } from "@/components/portal/PortalTabs"
import { FileText, Lock, TrendingUp } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ? Math.min(100, Math.max(0, Number(value))) : 0
  const color = pct >= 70
    ? "oklch(0.55 0.13 155)"
    : pct >= 40 ? "oklch(0.75 0.13 75)" : "oklch(0.65 0.14 25)"

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5" style={{ color: "oklch(0.52 0.04 155)" }}>
        <span>{label}</span>
        <span className="font-semibold" style={{ color }}>{value ? `${Number(value).toFixed(0)}/100` : "—"}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.015 155 / 60%)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default async function PortalRelatorioPage({ params }: { params: Promise<{ id: string }> }) {
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

  const reports = await db.select().from(viabilityReports)
    .where(and(eq(viabilityReports.projectId, projectId), eq(viabilityReports.isPublished, true)))
    .orderBy(viabilityReports.version)

  const [{ unread }] = await db.select({ unread: count() }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.isReadByClient, false)))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.58 0.05 155)" }}>
        <Link href="/portal" className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>Projetos</Link>
        <span>/</span>
        <Link href={`/portal/${projectId}`} className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>{project.name}</Link>
        <span>/</span>
        <span style={{ color: "oklch(0.25 0.05 155)" }}>Relatório</span>
      </div>

      <PortalTabs projectId={projectId} unreadMessages={unread} />

      {reports.length === 0 ? (
        <div className="rounded-2xl p-12 flex flex-col items-center gap-4 text-center"
             style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
          <div className="size-14 rounded-2xl flex items-center justify-center"
               style={{ background: "oklch(0.97 0.005 155)", border: "1px solid oklch(0.88 0.015 155)" }}>
            <Lock className="size-6" style={{ color: "oklch(0.65 0.05 155)" }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
              Relatório em preparação
            </h2>
            <p className="text-sm mt-1 max-w-sm" style={{ color: "oklch(0.52 0.04 155)" }}>
              A equipe técnica está elaborando o relatório de viabilidade.
              Você será notificado assim que estiver disponível.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {

            return (
              <div key={report.id} className="rounded-2xl overflow-hidden"
                   style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
                {/* Report header */}
                <div className="p-5 border-b" style={{ borderColor: "oklch(0.90 0.015 155 / 60%)" }}>
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: "oklch(0.45 0.13 155 / 12%)", border: "1px solid oklch(0.55 0.13 155 / 25%)" }}>
                      <FileText className="size-5" style={{ color: "oklch(0.45 0.13 155)" }} />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
                        {report.title}
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.56 0.04 155)" }}>
                        Versão {report.version} · Publicado em{" "}
                        {report.publishedAt
                          ? new Date(report.publishedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scores */}
                {(report.finalScore || report.geospatialScore || report.vegetationScore) && (
                  <div className="p-5 border-b space-y-3" style={{ borderColor: "oklch(0.90 0.015 155 / 60%)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="size-4" style={{ color: "oklch(0.48 0.10 155)" }} />
                      <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "oklch(0.48 0.06 155)" }}>
                        Pontuação de viabilidade
                      </h3>
                    </div>
                    {report.finalScore && (
                      <div className="flex items-center gap-3 p-3 rounded-xl mb-3"
                           style={{ background: "oklch(0.45 0.13 155 / 8%)", border: "1px solid oklch(0.55 0.13 155 / 20%)" }}>
                        <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.45 0.13 155)" }}>
                          {Number(report.finalScore).toFixed(0)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "oklch(0.25 0.08 155)" }}>Pontuação final</p>
                          <p className="text-xs" style={{ color: "oklch(0.50 0.06 155)" }}>de 100 pontos possíveis</p>
                        </div>
                      </div>
                    )}
                    <ScoreBar label="Geoespacial"  value={report.geospatialScore  ? Number(report.geospatialScore)  : null} />
                    <ScoreBar label="Vegetação"    value={report.vegetationScore   ? Number(report.vegetationScore)   : null} />
                    <ScoreBar label="Técnico"      value={report.consultantScore   ? Number(report.consultantScore)   : null} />
                  </div>
                )}

                {/* Conclusion */}
                {report.conclusion && (
                  <div className="p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "oklch(0.48 0.06 155)" }}>
                      Conclusão
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.28 0.04 155)" }}>
                      {report.conclusion}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
