import { auth } from "../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, projectWorkflowSteps, projectMessages } from "@/lib/db/schema"
import { eq, inArray, and, count } from "drizzle-orm"
import Link from "next/link"
import { MapPin, Ruler, ChevronRight, TreePine, MessageCircle } from "lucide-react"

export const metadata = { title: "Meus Projetos — ForestIA" }
export const dynamic = "force-dynamic"

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active:    { label: "Em andamento", dot: "oklch(0.55 0.15 155)",  text: "oklch(0.35 0.10 155)" },
  paused:    { label: "Pausado",      dot: "oklch(0.75 0.13 75)",   text: "oklch(0.50 0.10 75)"  },
  completed: { label: "Concluído",    dot: "oklch(0.55 0.13 230)",  text: "oklch(0.35 0.10 230)" },
  cancelled: { label: "Cancelado",    dot: "oklch(0.55 0.04 0)",    text: "oklch(0.45 0.03 0)"   },
}

export default async function PortalPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const userId = session.user.id!

  const db = getDb()

  // Projetos onde o cliente é o dono ou membro
  const memberOf = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId))

  const memberIds = memberOf.map(m => m.projectId)
  const clientProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientId, userId))

  const allIds = [...new Set([...memberIds, ...clientProjects.map(p => p.id)])]

  if (allIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="size-16 rounded-2xl flex items-center justify-center"
             style={{ background: "oklch(0.45 0.13 155 / 10%)", border: "1px solid oklch(0.55 0.13 155 / 20%)" }}>
          <TreePine className="size-8" style={{ color: "oklch(0.55 0.13 155)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
            Nenhum projeto encontrado
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.50 0.04 155)" }}>
            Você ainda não está vinculado a nenhum projeto.<br />
            Entre em contato com a equipe GreenForest.
          </p>
        </div>
      </div>
    )
  }

  const projectList = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, allIds))
    .orderBy(projects.createdAt)

  const allSteps = await db
    .select()
    .from(projectWorkflowSteps)
    .where(inArray(projectWorkflowSteps.projectId, allIds))

  // Mensagens não lidas por projeto
  const unreadCounts = await db
    .select({ projectId: projectMessages.projectId, n: count() })
    .from(projectMessages)
    .where(and(
      inArray(projectMessages.projectId, allIds),
      eq(projectMessages.isReadByClient, false)
    ))
    .groupBy(projectMessages.projectId)

  const unreadMap = Object.fromEntries(unreadCounts.map(r => [r.projectId, r.n]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-1"
           style={{ color: "oklch(0.55 0.13 155)" }}>
          GreenForest
        </p>
        <h1 className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
          Meus Projetos
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.50 0.04 155)" }}>
          {projectList.length} {projectList.length === 1 ? "projeto" : "projetos"} em acompanhamento
        </p>
      </div>

      {/* Project cards */}
      <div className="space-y-3">
        {projectList.map(project => {
          const steps = allSteps.filter(s => s.projectId === project.id).sort((a, b) => a.order - b.order)
          const done  = steps.filter(s => s.status === "completed").length
          const total = steps.length || 1
          const pct   = Math.round((done / total) * 100)
          const cfg   = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active
          const unread = unreadMap[project.id] ?? 0

          return (
            <Link
              key={project.id}
              href={`/portal/${project.id}`}
              className="block rounded-2xl p-5 transition-all hover:-translate-y-0.5 group"
              style={{
                background:  "oklch(1 0 0)",
                border:      "1px solid oklch(0.90 0.015 155 / 70%)",
                boxShadow:   "0 2px 12px oklch(0.17 0.05 155 / 6%)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="size-2 rounded-full shrink-0"
                          style={{ background: cfg.dot }} />
                    <span className="text-xs font-medium" style={{ color: cfg.text }}>
                      {cfg.label}
                    </span>
                    {unread > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "oklch(0.45 0.13 155 / 12%)", color: "oklch(0.38 0.12 155)" }}>
                        <MessageCircle className="size-3" />
                        {unread} nova{unread > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Name + description */}
                  <h2 className="font-bold truncate transition-colors group-hover:text-[oklch(0.45_0.13_155)]"
                      style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className="text-sm mt-0.5 line-clamp-1" style={{ color: "oklch(0.52 0.04 155)" }}>
                      {project.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "oklch(0.60 0.04 155)" }}>
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
                  </div>
                </div>

                <ChevronRight className="size-4 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
                              style={{ color: "oklch(0.70 0.06 155)" }} />
              </div>

              {/* Progress bar */}
              {steps.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "oklch(0.60 0.04 155)" }}>
                    <span>Progresso</span>
                    <span className="font-medium">{done}/{steps.length} etapas · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.015 155 / 60%)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: "oklch(0.55 0.13 155)" }}
                    />
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
