import { auth } from "../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import {
  projects, projectMembers, projectWorkflowSteps, projectMessages, viabilityReports,
} from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { PortalTabs } from "@/components/portal/PortalTabs"
import { MapPin, Ruler, Calendar, CheckCircle2, Circle, Clock, AlertCircle, FileText } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const STEP_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  completed:   { label: "Concluído",    icon: CheckCircle2, color: "oklch(0.55 0.13 155)" },
  in_progress: { label: "Em andamento", icon: Clock,        color: "oklch(0.60 0.13 230)" },
  delayed:     { label: "Atrasado",     icon: AlertCircle,  color: "oklch(0.65 0.15 25)"  },
  pending:     { label: "Aguardando",   icon: Circle,       color: "oklch(0.75 0.02 155)"  },
}

const DEFAULT_STEPS = [
  "Recepção e análise inicial do projeto",
  "Levantamento de campo e dados geoespaciais",
  "Análise de sobreposição e restrições",
  "Análise de imagens de satélite",
  "Elaboração do relatório de viabilidade",
  "Revisão e aprovação interna",
  "Entrega ao cliente",
]

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params
  const projectId = parseInt(id, 10)
  if (isNaN(projectId)) notFound()

  const userId = session.user.id!
  const db = getDb()

  // Verificar acesso
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) notFound()

  const isMember = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)

  const hasAccess = project.clientId === userId || isMember.length > 0
  if (!hasAccess) redirect("/portal")

  // Dados
  const steps = await db
    .select()
    .from(projectWorkflowSteps)
    .where(eq(projectWorkflowSteps.projectId, projectId))
    .orderBy(projectWorkflowSteps.order)

  const displaySteps = steps.length > 0
    ? steps
    : DEFAULT_STEPS.map((title, i) => ({
        id: i, title, order: i + 1, status: "pending",
        description: null, completedAt: null, updatedBy: null, projectId,
      }))

  const done  = displaySteps.filter(s => s.status === "completed").length
  const total = displaySteps.length
  const pct   = Math.round((done / total) * 100)

  const [{ unread }] = await db
    .select({ unread: count() })
    .from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.isReadByClient, false)))

  const publishedReports = await db
    .select({ id: viabilityReports.id, title: viabilityReports.title, publishedAt: viabilityReports.publishedAt })
    .from(viabilityReports)
    .where(and(eq(viabilityReports.projectId, projectId), eq(viabilityReports.isPublished, true)))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.58 0.05 155)" }}>
        <Link href="/portal" className="hover:underline" style={{ color: "oklch(0.45 0.10 155)" }}>
          Meus Projetos
        </Link>
        <span>/</span>
        <span className="truncate" style={{ color: "oklch(0.25 0.05 155)" }}>{project.name}</span>
      </div>

      {/* Project header */}
      <div className="rounded-2xl p-6"
           style={{ background: "oklch(0.17 0.05 155)", border: "1px solid oklch(0.25 0.06 155 / 60%)" }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1"
               style={{ color: "oklch(0.62 0.14 155)" }}>
              Projeto Florestal
            </p>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.95 0.010 80)" }}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm mt-1" style={{ color: "oklch(0.58 0.06 155)" }}>
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: "oklch(0.52 0.06 155)" }}>
              {project.municipality && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {project.municipality}{project.state ? `, ${project.state}` : ""}
                </span>
              )}
              {project.areaHectares && (
                <span className="flex items-center gap-1">
                  <Ruler className="size-3" />
                  {Number(project.areaHectares).toLocaleString("pt-BR")} ha
                </span>
              )}
              {project.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Início: {new Date(project.startDate).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          {/* Progress ring / percent */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.70 0.14 155)" }}>
              {pct}%
            </span>
            <span className="text-[11px]" style={{ color: "oklch(0.48 0.06 155)" }}>concluído</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.05 155)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "oklch(0.62 0.15 155)" }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "oklch(0.48 0.06 155)" }}>
            {done} de {total} etapas concluídas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <PortalTabs projectId={projectId} unreadMessages={unread} />

      {/* Published report banner */}
      {publishedReports.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3"
             style={{ background: "oklch(0.55 0.13 155 / 10%)", border: "1px solid oklch(0.55 0.13 155 / 25%)" }}>
          <FileText className="size-5 shrink-0" style={{ color: "oklch(0.50 0.13 155)" }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "oklch(0.25 0.08 155)" }}>
              Relatório disponível
            </p>
            <p className="text-xs" style={{ color: "oklch(0.48 0.06 155)" }}>
              O relatório de viabilidade foi publicado e está pronto para visualização.
            </p>
          </div>
          <Link href={`/portal/${projectId}/relatorio`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "oklch(0.45 0.13 155)", color: "white" }}>
            Ver relatório
          </Link>
        </div>
      )}

      {/* Workflow timeline */}
      <div className="rounded-2xl p-6"
           style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-5"
            style={{ color: "oklch(0.48 0.06 155)" }}>
          Fluxo de trabalho
        </h2>

        <div className="space-y-0">
          {displaySteps.map((step, idx) => {
            const cfg = STEP_CONFIG[step.status ?? "pending"] ?? STEP_CONFIG.pending
            const Icon = cfg.icon
            const isLast = idx === displaySteps.length - 1
            const isActive = step.status === "in_progress"

            return (
              <div key={step.id} className="flex gap-4">
                {/* Icon + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className="size-8 rounded-full flex items-center justify-center shrink-0 z-10"
                    style={{
                      background: isActive ? "oklch(0.45 0.13 155 / 15%)" : "oklch(0.97 0.005 155)",
                      border: `1.5px solid ${cfg.color}`,
                    }}
                  >
                    <Icon className="size-4" style={{ color: cfg.color }} />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 my-1"
                         style={{ background: step.status === "completed" ? "oklch(0.55 0.13 155 / 40%)" : "oklch(0.88 0.015 155)" }} />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span
                      className="text-sm font-medium"
                      style={{ color: isActive ? "oklch(0.16 0.015 155)" : "oklch(0.32 0.04 155)" }}
                    >
                      {step.title}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "oklch(0.55 0.13 230 / 15%)", color: "oklch(0.40 0.12 230)" }}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.58 0.04 155)" }}>
                      {step.description}
                    </p>
                  )}
                  {step.completedAt && (
                    <p className="text-xs mt-0.5 font-medium" style={{ color: "oklch(0.50 0.12 155)" }}>
                      ✓ {new Date(step.completedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
