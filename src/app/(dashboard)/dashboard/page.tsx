import { auth } from "../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import {
  projects, viabilityReports, aoiAnalyses,
  satelliteAnalyses, users,
} from "@/lib/db/schema"
import { count, eq, inArray } from "drizzle-orm"
import { FolderKanban, FileText, Map, Users, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export const metadata = { title: "Início — ForestIA" }
export const dynamic   = "force-dynamic"

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  funcionario: "Funcionário",
  cliente:     "Cliente",
}

/* ── Module quick-links ─────────────────────────────────────────────────── */
const MODULES = [
  { label: "Gestão de Usuários",        href: "/dashboard/users",              roles: ["admin","gerente"] },
  { label: "Bases Geoespaciais",        href: "/dashboard/geospatial-sources", roles: ["admin","gerente","funcionario"] },
  { label: "Análise Geoespacial",       href: "/dashboard/aoi-analysis",       roles: ["admin","gerente","funcionario"] },
  { label: "Análise por Satélite",      href: "/dashboard/satellite",          roles: ["admin","gerente","funcionario"] },
  { label: "Relatórios de Viabilidade", href: "/dashboard/reports",            roles: ["admin","gerente","funcionario","cliente"] },
  { label: "Gestão de Projetos",        href: "/dashboard/projects",           roles: ["admin","gerente","funcionario","cliente"] },
  { label: "Novos Serviços",            href: "/dashboard/opportunities",      roles: ["admin","gerente"] },
  { label: "Portal Cliente",            href: "/dashboard/client-portal",      roles: ["cliente"] },
]

/* ── Helpers ────────────────────────────────────────────────────────────── */
async function fetchStats(role: string, userId: string) {
  const db = getDb()

  // Count active projects visible to this user
  let activeProjects = 0
  if (["admin","gerente"].includes(role)) {
    const [r] = await db.select({ n: count() }).from(projects).where(eq(projects.status, "active"))
    activeProjects = r.n
  } else if (role === "funcionario") {
    const { projectMembers } = await import("@/lib/db/schema")
    const memberOf = await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, userId))
    if (memberOf.length) {
      const ids = memberOf.map(m => m.projectId)
      const [r] = await db.select({ n: count() }).from(projects).where(inArray(projects.id, ids))
      activeProjects = r.n
    }
  } else {
    const [r] = await db.select({ n: count() }).from(projects).where(eq(projects.clientId, userId))
    activeProjects = r.n
  }

  // Reports visible to this user
  const [repRow] = await db.select({ n: count() }).from(viabilityReports)
  const reportCount = repRow.n

  // Geospatial analyses (AOI + satellite combined)
  const [aoiRow] = await db.select({ n: count() }).from(aoiAnalyses)
  const [satRow] = await db.select({ n: count() }).from(satelliteAnalyses)
  const analysisCount = aoiRow.n + satRow.n

  // Active users — admin/gerente only
  let activeUsers = 0
  if (["admin","gerente"].includes(role)) {
    const [r] = await db.select({ n: count() }).from(users).where(eq(users.isActive, true))
    activeUsers = r.n
  }

  return { activeProjects, reportCount, analysisCount, activeUsers }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const session   = await auth()
  const role      = session?.user.role ?? "funcionario"
  const userId    = session?.user.id   ?? ""
  const firstName = session?.user.name?.split(" ")[0] ?? "Usuário"

  const { activeProjects, reportCount, analysisCount, activeUsers } = await fetchStats(role, userId)

  type StatCard = {
    label: string
    value: number
    href:  string
    icon:  React.ElementType
    color: string
    glow:  string
    roles: string[]
  }

  const STAT_CARDS: StatCard[] = [
    {
      label: "Projetos Ativos",
      value: activeProjects,
      href:  "/dashboard/projects",
      icon:  FolderKanban,
      color: "bg-emerald-500",
      glow:  "shadow-emerald-500/30",
      roles: ["admin","gerente","funcionario","cliente"],
    },
    {
      label: "Relatórios Gerados",
      value: reportCount,
      href:  "/dashboard/reports",
      icon:  FileText,
      color: "bg-blue-500",
      glow:  "shadow-blue-500/30",
      roles: ["admin","gerente","funcionario","cliente"],
    },
    {
      label: "Análises Geoespaciais",
      value: analysisCount,
      href:  "/dashboard/satellite",
      icon:  Map,
      color: "bg-violet-500",
      glow:  "shadow-violet-500/30",
      roles: ["admin","gerente","funcionario"],
    },
    {
      label: "Usuários Ativos",
      value: activeUsers,
      href:  "/dashboard/users",
      icon:  Users,
      color: "bg-amber-500",
      glow:  "shadow-amber-500/30",
      roles: ["admin","gerente"],
    },
  ]

  const stats   = STAT_CARDS.filter(c => c.roles.includes(role))
  const modules = MODULES.filter(m => m.roles.includes(role))

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">
            Visão geral
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Bem-vindo ao painel de controle do ForestIA
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shrink-0 self-start">
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-start justify-between gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 mb-1 truncate">{card.label}</p>
                <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">
                  {card.value.toLocaleString("pt-BR")}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalhes <ArrowUpRight className="size-3" />
                </p>
              </div>
              <div className={cn(
                "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                card.color, card.glow,
              )}>
                <Icon className="size-5 text-white" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Modules ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-700">Módulos disponíveis</h2>
          <span className="text-xs text-zinc-400">{modules.length} módulo{modules.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {modules.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="group flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 hover:shadow-md"
            >
              <span className="size-2 rounded-full bg-emerald-400 group-hover:bg-emerald-500 shrink-0 transition-colors" />
              <span className="flex-1 truncate">{m.label}</span>
              <ArrowUpRight className="size-3.5 text-zinc-300 group-hover:text-emerald-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
