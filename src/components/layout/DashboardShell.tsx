"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Menu, X, TreePine } from "lucide-react"

interface DashboardShellProps {
  userRole: string
  userName: string | null | undefined
  children: React.ReactNode
}

/**
 * Client shell that:
 * - renders the collapsible Sidebar on desktop (md+)
 * - renders a top bar with hamburger on mobile (<md)
 * - overlays the Sidebar on mobile when open, with a backdrop
 */
export function DashboardShell({ userRole, userName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sidebar when route changes (popstate / link navigation)
  useEffect(() => {
    const close = () => setMobileOpen(false)
    window.addEventListener("popstate", close)
    return () => window.removeEventListener("popstate", close)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <div className="flex h-svh overflow-hidden">

      {/* ── Desktop sidebar (md+) ──────────────────────────── */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar userRole={userRole} userName={userName} onNavigate={() => {}} />
      </div>

      {/* ── Mobile overlay sidebar (<md) ───────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex flex-col md:hidden">
            <Sidebar userRole={userRole} userName={userName} onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex md:hidden h-14 flex-shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4">
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className="flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TreePine className="size-4 text-emerald-500" />
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-wide">ForestIA</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-zinc-50 overflow-auto min-h-0">
          {children}
        </main>
      </div>

    </div>
  )
}
