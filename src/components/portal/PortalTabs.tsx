"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface Tab {
  label: string
  href: string
  badge?: number
}

export function PortalTabs({ projectId, unreadMessages }: { projectId: number; unreadMessages: number }) {
  const pathname = usePathname()
  const base = `/portal/${projectId}`

  const tabs: Tab[] = [
    { label: "Visão Geral",  href: base },
    { label: "Mapa",         href: `${base}/mapa` },
    { label: "Análises",     href: `${base}/analises` },
    { label: "Relatório",    href: `${base}/relatorio` },
    { label: "Documentos",   href: `${base}/documentos` },
    { label: "Mensagens",    href: `${base}/mensagens`, badge: unreadMessages },
  ]

  return (
    <div className="flex gap-0.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
      {tabs.map(tab => {
        const active = tab.href === base
          ? pathname === base
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-sm font-medium rounded-lg transition-all",
              active
                ? "text-[oklch(0.38_0.12_155)]"
                : "text-[oklch(0.52_0.05_155)] hover:text-[oklch(0.25_0.08_155)] hover:bg-[oklch(0.45_0.13_155/8%)]"
            )}
            style={active ? {
              background: "oklch(0.45 0.13 155 / 12%)",
              border: "1px solid oklch(0.55 0.13 155 / 20%)",
            } : { border: "1px solid transparent" }}
          >
            {tab.label}
            {tab.badge ? (
              <span
                className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                style={{ background: "oklch(0.45 0.13 155)", color: "white" }}
              >
                {tab.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
