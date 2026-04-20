import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800", paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800", cancelled: "bg-red-100 text-red-800",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado",
}

const TABS = [
  { href: "",          label: "Visão Geral",      icon: "🏠" },
  { href: "/geo",      label: "Análise Geoespacial", icon: "🗺️" },
  { href: "/satellite",label: "Satélite",          icon: "🛰️" },
  { href: "/services", label: "Novos Serviços",    icon: "💡" },
  { href: "/report",   label: "Relatório",         icon: "📄" },
  { href: "/log",      label: "Auditoria",         icon: "🔒" },
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
  const [project] = await db.select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projects).where(eq(projects.id, Number(id))).limit(1)
  if (!project) notFound()

  const base = `/dashboard/projects/${id}`

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="bg-white border-b px-6 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard/projects" className="text-sm text-gray-400 hover:text-gray-600">← Projetos</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
          <Badge className={cn("text-xs", STATUS_STYLES[project.status] ?? "")}>
            {STATUS_LABELS[project.status] ?? project.status}
          </Badge>
        </div>
        {/* Tabs */}
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const href = `${base}${tab.href}`
            return (
              <TabLink key={tab.href} href={href} exactMatch={tab.href === ""}>
                {tab.icon} {tab.label}
              </TabLink>
            )
          })}
        </nav>
      </div>

      {/* Tab content — each page manages its own scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// Client tab link — needs pathname to detect active state
function TabLink({ href, children, exactMatch }: { href: string; children: React.ReactNode; exactMatch?: boolean }) {
  // In server components we can't use usePathname, so we use a client component
  return <TabLinkClient href={href} exactMatch={exactMatch}>{children}</TabLinkClient>
}

// Split out so layout stays a server component
import { TabLinkClient } from "@/components/layout/TabLinkClient"
