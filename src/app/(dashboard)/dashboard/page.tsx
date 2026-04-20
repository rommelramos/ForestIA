import { auth } from "../../../../auth"
import { FolderKanban, FileText, Map, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  funcionario: "Funcionário",
  cliente:     "Cliente",
}

const STAT_CARDS = [
  {
    label: "Projetos Ativos",
    value: "—",
    icon: FolderKanban,
    color: "bg-emerald-500",
    glow:  "shadow-emerald-500/20",
    roles: ["admin","gerente","funcionario","cliente"],
  },
  {
    label: "Relatórios Gerados",
    value: "—",
    icon: FileText,
    color: "bg-blue-500",
    glow:  "shadow-blue-500/20",
    roles: ["admin","gerente","funcionario","cliente"],
  },
  {
    label: "Análises Geoespaciais",
    value: "—",
    icon: Map,
    color: "bg-violet-500",
    glow:  "shadow-violet-500/20",
    roles: ["admin","gerente","funcionario"],
  },
  {
    label: "Usuários Ativos",
    value: "—",
    icon: Users,
    color: "bg-amber-500",
    glow:  "shadow-amber-500/20",
    roles: ["admin","gerente"],
  },
]

const MODULES = [
  { label: "Gestão de Usuários",       href: "/dashboard/users",              roles: ["admin","gerente"] },
  { label: "Bases Geoespaciais",       href: "/dashboard/geospatial-sources", roles: ["admin","gerente","funcionario"] },
  { label: "Análise Geoespacial",      href: "/dashboard/projects",           roles: ["admin","gerente","funcionario"] },
  { label: "Análise por Satélite",     href: "/dashboard/satellite",          roles: ["admin","gerente","funcionario"] },
  { label: "Relatórios de Viabilidade",href: "/dashboard/reports",            roles: ["admin","gerente","funcionario","cliente"] },
  { label: "Gestão de Projetos",       href: "/dashboard/projects",           roles: ["admin","gerente","funcionario","cliente"] },
  { label: "Novos Serviços",           href: "/dashboard/opportunities",      roles: ["admin","gerente"] },
  { label: "Integrações",             href: "/dashboard/integrations",       roles: ["admin","gerente","funcionario"] },
  { label: "Portal Cliente",           href: "/dashboard/client-portal",      roles: ["cliente"] },
]

export default async function DashboardPage() {
  const session = await auth()
  const role    = session?.user.role ?? "funcionario"
  const firstName = session?.user.name?.split(" ")[0] ?? "Usuário"

  const stats   = STAT_CARDS.filter((c) => c.roles.includes(role))
  const modules = MODULES.filter((m) => m.roles.includes(role))

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
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
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shrink-0">
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-zinc-900 tabular-nums">{card.value}</p>
              </div>
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", card.color, card.glow)}>
                <Icon className="size-5 text-white" />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modules ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-700">Módulos disponíveis</h2>
          <span className="text-xs text-zinc-400">{modules.length} módulo{modules.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {modules.map((m) => (
            <a
              key={m.label}
              href={m.href}
              className="group flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 hover:shadow-md"
            >
              <span className="size-2 rounded-full bg-emerald-400 group-hover:bg-emerald-500 shrink-0 transition-colors" />
              {m.label}
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
