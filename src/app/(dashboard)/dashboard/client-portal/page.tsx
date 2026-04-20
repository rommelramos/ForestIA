import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers, projectWorkflowSteps } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"

export const dynamic = "force-dynamic"

const STEP_STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pending:     { label: "Aguardando",   cls: "bg-gray-100 text-gray-500 border-gray-200",    icon: "⏳" },
  in_progress: { label: "Em andamento", cls: "bg-blue-100 text-blue-700 border-blue-200",   icon: "🔄" },
  completed:   { label: "Concluído",    cls: "bg-green-100 text-green-700 border-green-200", icon: "✅" },
  delayed:     { label: "Atrasado",     cls: "bg-red-100 text-red-700 border-red-200",       icon: "⚠️" },
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

export default async function ClientPortalPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "cliente") redirect("/dashboard")

  const db = getDb()
  const userId = session.user.id

  const memberOf = await db.select({ projectId: projectMembers.projectId })
    .from(projectMembers).where(eq(projectMembers.userId, userId))
  const memberIds = memberOf.map(m => m.projectId)
  const clientProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.clientId, userId))
  const allIds = [...new Set([...memberIds, ...clientProjects.map(p => p.id)])]

  if (allIds.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl mb-3">🌲</p>
        <h2 className="font-bold text-gray-900 mb-2">Bem-vindo ao ForestIA</h2>
        <p className="text-gray-500 text-sm">Você ainda não está vinculado a nenhum projeto.</p>
      </div>
    )
  }

  const projectList = await db.select().from(projects).where(inArray(projects.id, allIds))
  const allSteps = await db.select().from(projectWorkflowSteps).where(inArray(projectWorkflowSteps.projectId, allIds))

  const STATUS_STYLES: Record<string, string> = {
    active: "bg-green-100 text-green-800", paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800", cancelled: "bg-red-100 text-red-800",
  }
  const STATUS_LABELS: Record<string, string> = { active: "Ativo", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado" }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal do Cliente</h1>
        <p className="text-sm text-gray-500 mt-1">Acompanhe o andamento dos seus projetos em tempo real.</p>
      </div>

      {projectList.map((project) => {
        const projectSteps = allSteps.filter(s => s.projectId === project.id).sort((a, b) => a.order - b.order)
        const displaySteps = projectSteps.length > 0
          ? projectSteps
          : DEFAULT_STEPS.map((title, i) => ({
              id: i, title, order: i + 1, status: "pending",
              description: null, completedAt: null, updatedBy: null, projectId: project.id,
            }))
        const doneCount = displaySteps.filter(s => s.status === "completed").length
        const pct = Math.round((doneCount / displaySteps.length) * 100)

        return (
          <div key={project.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="p-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{project.name}</h2>
                  {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {project.municipality && <span>📍 {project.municipality}{project.state ? `, ${project.state}` : ""}</span>}
                    {project.areaHectares && <span>📐 {Number(project.areaHectares).toLocaleString("pt-BR")} ha</span>}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[project.status] ?? ""}`}>
                  {STATUS_LABELS[project.status] ?? project.status}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progresso geral</span>
                  <span>{doneCount}/{displaySteps.length} etapas · {pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Fluxo de trabalho</h3>
              <div>
                {displaySteps.map((step, idx) => {
                  const st = STEP_STATUS[step.status ?? "pending"] ?? STEP_STATUS.pending
                  const isLast = idx === displaySteps.length - 1
                  return (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0 ${st.cls}`}>
                          {st.icon}
                        </div>
                        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 my-1" style={{ minHeight: "24px" }} />}
                      </div>
                      <div className={`${isLast ? "pb-0" : "pb-4"} flex-1`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">{step.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                        </div>
                        {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                        {step.completedAt && (
                          <p className="text-xs text-green-600 mt-0.5">
                            ✓ {new Date(step.completedAt).toLocaleDateString("pt-BR")}
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
      })}
    </div>
  )
}
