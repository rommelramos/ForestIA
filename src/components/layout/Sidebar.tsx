"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Users, Map, Satellite, FileText,
  FolderKanban, Lightbulb, Plug, Building2, Settings,
  LogOut, Database, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: string[]
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: "Início",                 href: "/dashboard",                 icon: LayoutDashboard, roles: ["admin","gerente","funcionario","cliente"] },
  { label: "Projetos",               href: "/dashboard/projects",         icon: FolderKanban,    roles: ["admin","gerente","funcionario","cliente"] },
  { label: "Usuários",               href: "/dashboard/users",            icon: Users,           roles: ["admin","gerente"] },
  { label: "Solicitações de Acesso", href: "/dashboard/access-requests",  icon: Building2,       roles: ["admin"] },
  { label: "Bases Geoespaciais",     href: "/dashboard/geospatial-sources",icon: Map,            roles: ["admin","gerente","funcionario"] },
  { label: "Integrações",            href: "/dashboard/integrations",     icon: Plug,            roles: ["admin","gerente","funcionario"] },
  { label: "Portal Cliente",         href: "/dashboard/client-portal",    icon: Building2,       roles: ["cliente"] },
  { label: "Banco de Dados",         href: "/setup/db",                   icon: Database,        roles: ["admin"] },
  { label: "Log de Auditoria",       href: "/dashboard/audit-log",        icon: Settings,        roles: ["admin"] },
]

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  funcionario: "Funcionário",
  cliente: "Cliente",
}

interface SidebarProps {
  userRole: string
  userName: string | null | undefined
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-green-950 text-white">
      <div className="px-6 py-5 border-b border-green-800">
        <h1 className="text-xl font-bold tracking-tight">ForestIA</h1>
        <p className="text-xs text-green-400 mt-0.5">Gestão Florestal Inteligente</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-green-700 text-white"
                  : "text-green-200 hover:bg-green-800 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && <Badge className="text-xs">{item.badge}</Badge>}
              {active && <ChevronRight className="size-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-green-800 space-y-3">
        <Separator className="bg-green-800" />
        <div className="px-2">
          <p className="text-sm font-medium text-white truncate">{userName ?? "Usuário"}</p>
          <p className="text-xs text-green-400">{ROLE_LABELS[userRole] ?? userRole}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-green-300 hover:bg-green-800 hover:text-white transition-colors"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
