"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Users, Map,
  FolderKanban, Building2,
  LogOut, Database, Settings, TreePine,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      { label: "Início",   href: "/dashboard",          icon: LayoutDashboard, roles: ["admin","gerente","funcionario","cliente"] },
      { label: "Projetos", href: "/dashboard/projects",  icon: FolderKanban,    roles: ["admin","gerente","funcionario","cliente"] },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { label: "Bases Geoespaciais", href: "/dashboard/geospatial-sources", icon: Map,       roles: ["admin","gerente","funcionario"] },
      { label: "Portal Cliente",     href: "/dashboard/client-portal",       icon: Building2, roles: ["cliente"] },
    ],
  },
  {
    title: "Administração",
    items: [
      { label: "Usuários",               href: "/dashboard/users",           icon: Users,     roles: ["admin","gerente"] },
      { label: "Solicitações de Acesso", href: "/dashboard/access-requests", icon: Building2, roles: ["admin"] },
      { label: "Banco de Dados",         href: "/setup/db",                  icon: Database,  roles: ["admin"] },
      { label: "Log de Auditoria",       href: "/dashboard/audit-log",       icon: Settings,  roles: ["admin"] },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  funcionario: "Funcionário",
  cliente:     "Cliente",
}

interface SidebarProps {
  userRole: string
  userName: string | null | undefined
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname   = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapse state across navigations
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem("sidebar-collapsed", String(!c))
      return !c
    })
  }

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <aside
      className={cn(
        "flex flex-col h-full flex-shrink-0 bg-zinc-950 border-r border-zinc-800/50 transition-all duration-200",
        collapsed ? "w-[52px]" : "w-64"
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className={cn("border-b border-zinc-800/50 flex items-center gap-3 flex-shrink-0", collapsed ? "px-2 py-4 justify-center" : "px-5 py-5")}>
        <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <TreePine className="size-5 text-emerald-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide leading-none">ForestIA</p>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-0.5">Gestão Florestal</p>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => item.roles.includes(userRole))
          if (visible.length === 0) return null
          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-1.5">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const Icon = item.icon
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 border",
                        collapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                        active
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          : "text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-zinc-800/50"
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-emerald-400" : "")} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && active && <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </Link>
                  )
                })}
              </div>
              {collapsed && <div className="my-2 h-px bg-zinc-800/50" />}
            </div>
          )
        })}
      </nav>

      {/* ── User card ────────────────────────────────────────── */}
      <div className={cn("border-t border-zinc-800/50 flex-shrink-0", collapsed ? "p-2" : "px-3 pb-4 pt-2")}>
        {collapsed ? (
          /* Collapsed: just initials button */
          <div className="flex flex-col items-center gap-2">
            <div
              className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
              title={userName ?? "Usuário"}
            >
              <span className="text-xs font-bold text-emerald-400">{initials}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sair"
              className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-emerald-400">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {userName ?? "Usuário"}
                </p>
                <p className="text-[11px] text-zinc-500 leading-tight">
                  {ROLE_LABELS[userRole] ?? userRole}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="size-3.5 shrink-0" />
              Encerrar sessão
            </button>
          </div>
        )}
      </div>

      {/* ── Collapse toggle ───────────────────────────────────── */}
      <button
        onClick={toggle}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        className={cn(
          "flex items-center justify-center h-9 border-t border-zinc-800/50 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors flex-shrink-0",
          collapsed ? "w-full" : "w-full gap-2 text-xs"
        )}
      >
        {collapsed
          ? <ChevronRight className="size-3.5" />
          : <><ChevronLeft className="size-3.5" /><span>Recolher</span></>
        }
      </button>
    </aside>
  )
}
