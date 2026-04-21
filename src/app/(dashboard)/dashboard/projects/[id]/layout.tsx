import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { TabLinkClient } from "@/components/layout/TabLinkClient"
import {
  LayoutDashboard, Map, Satellite, Lightbulb,
  FileText, ShieldCheck, ArrowLeft,
} from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_BAR: Record<string, string> = {
  active:    "bg-emerald-500",
  paused:    "bg-amber-400",
  completed: "bg-blue-500",
  cancelled: "bg-zinc-400",
}
const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused:    "bg-amber-50  text-amber-700  border-amber-200",
  completed: "bg-blue-50   text-blue-700   border-blue-200",
  cancelled: "bg-zinc-100  text-zinc-500   border-zinc-200",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado",
}

const TABS = [
  { href: "",           label: "Visão Geral",        icon: LayoutDashboard, exact: true },
  { href: "/geo",       label: "Análise Geoespacial", icon: Map },
  { href: "/satellite", label: "Satélite",            icon: Satellite },
  { href: "/services",  label: "Serviços",            icon: Lightbulb },
  { href: "/report",    label: "Relatório",           icon: FileText },
  { href: "/log",       label: "Auditoria",           icon: ShieldCheck },
]

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const db = getDb()
  const [project] = await db
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projects)
    .where(eq(projects.id, Number(id)))
    .limit(1)
  if (!project) notFound()

  const base = `/dashboard/projects/${id}`

  return (
    <div className="flex flex-col h-full">
      {/* ── Project header ──────────────────────────────────── */}
      <div className="bg-white border-b flex-shrink-0">
        {/* Status accent bar */}
        <div className={cn("h-0.5", STATUS_BAR[project.status] ?? "bg-zinc-300")} />

        <div className="px-6 pt-4 pb-0">
          {/* Breadcrumb + title */}
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-3" />
              Projetos
            </Link>
            <span className="text-zinc-200">/</span>
            <h1 className="text-base font-bold text-zinc-900 truncate">{project.name}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0",
                STATUS_BADGE[project.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
              )}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <TabLinkClient key={tab.href} href={`${base}${tab.href}`} exactMatch={tab.exact}>
                  <Icon className="size-3.5" />
                  {tab.label}
                </TabLinkClient>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
