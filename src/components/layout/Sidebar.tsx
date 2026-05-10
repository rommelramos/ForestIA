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
      { label: "Início",   href: "/dashboard",         icon: LayoutDashboard, roles: ["admin","gerente","funcionario"] },
      { label: "Projetos", href: "/dashboard/projects", icon: FolderKanban,    roles: ["admin","gerente","funcionario"] },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { label: "Bases Geoespaciais", href: "/dashboard/geospatial-sources", icon: Map,       roles: ["admin","gerente","funcionario"] },
      { label: "Portal Cliente",     href: "/portal",                        icon: Building2, roles: ["admin","gerente"] },
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
  userRole:     string
  userName:     string | null | undefined
  /** Called after the user clicks a nav link — used by mobile overlay to close itself. */
  onNavigate?:  () => void
}

export function Sidebar({ userRole, userName, onNavigate }: SidebarProps) {
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
        "flex flex-col h-full flex-shrink-0 transition-all duration-200",
        collapsed ? "w-[52px]" : "w-64"
      )}
      style={{ background: "oklch(0.17 0.05 155)", borderRight: "1px solid oklch(0.25 0.05 155 / 60%)" }}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div
        className={cn("flex items-center gap-3 flex-shrink-0", collapsed ? "px-2 py-4 justify-center" : "px-5 py-5")}
        style={{ borderBottom: "1px solid oklch(0.25 0.05 155 / 50%)" }}
      >
        <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: "oklch(0.45 0.13 155 / 30%)", border: "1px solid oklch(0.55 0.13 155 / 40%)" }}>
          <TreePine className="size-5" style={{ color: "oklch(0.70 0.14 155)" }} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-widest leading-none"
               style={{ fontFamily: "var(--font-display)", color: "oklch(0.92 0.012 80)" }}>
              ForestIA
            </p>
            <p className="text-[10px] tracking-widest uppercase mt-0.5"
               style={{ color: "oklch(0.48 0.06 155)" }}>
              Gestão Florestal
            </p>
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
                <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5"
                   style={{ color: "oklch(0.38 0.06 155)" }}>
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
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 border",
                        collapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                        active
                          ? "border-[oklch(0.55_0.13_155/30%)]"
                          : "border-transparent hover:border-[oklch(0.30_0.06_155/40%)] hover:bg-[oklch(0.25_0.06_155/50%)]"
                      )}
                      style={active ? {
                        background: "oklch(0.45 0.13 155 / 25%)",
                        color:      "oklch(0.78 0.12 155)",
                      } : {
                        color: "oklch(0.52 0.06 155)",
                      }}
                    >
                      <Icon className="size-4 shrink-0"
                            style={{ color: active ? "oklch(0.70 0.14 155)" : undefined }} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && active && (
                        <span className="size-1.5 rounded-full shrink-0"
                              style={{ background: "oklch(0.70 0.14 155)" }} />
                      )}
                    </Link>
                  )
                })}
              </div>
              {collapsed && (
                <div className="my-2 h-px" style={{ background: "oklch(0.25 0.05 155 / 50%)" }} />
              )}
            </div>
          )
        })}
      </nav>

      {/* ── User card ────────────────────────────────────────── */}
      <div
        className={cn("flex-shrink-0", collapsed ? "p-2" : "px-3 pb-4 pt-2")}
        style={{ borderTop: "1px solid oklch(0.25 0.05 155 / 50%)" }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="size-8 rounded-lg flex items-center justify-center"
              title={userName ?? "Usuário"}
              style={{ background: "oklch(0.45 0.13 155 / 30%)", border: "1px solid oklch(0.55 0.13 155 / 40%)" }}
            >
              <span className="text-xs font-bold" style={{ color: "oklch(0.70 0.14 155)" }}>{initials}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sair"
              className="size-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "oklch(0.42 0.05 155)" }}
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-3"
               style={{ background: "oklch(0.21 0.05 155 / 70%)", border: "1px solid oklch(0.28 0.06 155 / 60%)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="size-8 rounded-lg flex items-center justify-center shrink-0"
                   style={{ background: "oklch(0.45 0.13 155 / 30%)", border: "1px solid oklch(0.55 0.13 155 / 40%)" }}>
                <span className="text-xs font-bold" style={{ color: "oklch(0.70 0.14 155)" }}>{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight"
                   style={{ color: "oklch(0.90 0.012 80)" }}>
                  {userName ?? "Usuário"}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: "oklch(0.45 0.05 155)" }}>
                  {ROLE_LABELS[userRole] ?? userRole}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: "oklch(0.42 0.05 155)" }}
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
          "flex items-center justify-center h-9 transition-colors flex-shrink-0",
          collapsed ? "w-full" : "w-full gap-2 text-xs"
        )}
        style={{ borderTop: "1px solid oklch(0.25 0.05 155 / 50%)", color: "oklch(0.38 0.05 155)" }}
      >
        {collapsed
          ? <ChevronRight className="size-3.5" />
          : <><ChevronLeft className="size-3.5" /><span>Recolher</span></>
        }
      </button>
    </aside>
  )
}
