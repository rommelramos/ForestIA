import { auth } from "../../../auth"
import { redirect } from "next/navigation"
import { TreePine, LogOut } from "lucide-react"
import Link from "next/link"
import { SignOutButton } from "@/components/portal/SignOutButton"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "cliente") redirect("/dashboard")

  const firstName = session.user.name?.split(" ")[0] ?? "Cliente"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.985 0.006 80)" }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14 flex-shrink-0"
        style={{
          background: "oklch(1 0 0)",
          borderBottom: "1px solid oklch(0.90 0.015 155 / 60%)",
          boxShadow: "0 1px 8px oklch(0.17 0.05 155 / 6%)",
        }}
      >
        {/* Logo */}
        <Link href="/portal" className="flex items-center gap-2.5 group">
          <div
            className="size-8 rounded-lg flex items-center justify-center transition-opacity group-hover:opacity-80"
            style={{ background: "oklch(0.45 0.13 155 / 15%)", border: "1px solid oklch(0.55 0.13 155 / 30%)" }}
          >
            <TreePine className="size-4" style={{ color: "oklch(0.45 0.13 155)" }} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-widest uppercase leading-none"
               style={{ fontFamily: "var(--font-display)", color: "oklch(0.20 0.05 155)" }}>
              ForestIA
            </p>
            <p className="text-[9px] tracking-widest uppercase leading-tight"
               style={{ color: "oklch(0.55 0.06 155)" }}>
              Portal do Cliente
            </p>
          </div>
        </Link>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: "oklch(0.42 0.05 155)" }}>
            Olá, <span className="font-semibold" style={{ color: "oklch(0.20 0.05 155)" }}>{firstName}</span>
          </span>
          <SignOutButton />
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="py-5 text-center">
        <p className="text-[11px]" style={{ color: "oklch(0.60 0.03 155)" }}>
          ForestIA · GreenForest · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
