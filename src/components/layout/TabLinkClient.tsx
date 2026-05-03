"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function TabLinkClient({
  href,
  children,
  exactMatch,
}: {
  href: string
  children: React.ReactNode
  exactMatch?: boolean
}) {
  const pathname = usePathname()
  const isActive = exactMatch ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
        isActive
          ? "border-primary text-primary bg-accent/60"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {children}
    </Link>
  )
}
