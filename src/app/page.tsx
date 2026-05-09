import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isDbConfigured } from "@/lib/env"
import { TreePine, Satellite, BarChart3, ArrowRight, AlertTriangle } from "lucide-react"

export default function Home() {
  const dbConfigured = isDbConfigured()

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden"
         style={{ background: "oklch(0.17 0.05 155)" }}>

      {/* ── Atmospheric background ──────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial forest glow — top */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-30"
             style={{ background: "radial-gradient(ellipse, oklch(0.55 0.15 155) 0%, transparent 70%)" }} />
        {/* Warm amber glow — bottom right */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
             style={{ background: "radial-gradient(circle, oklch(0.78 0.13 75) 0%, transparent 70%)" }} />
        {/* Subtle texture grid */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: "linear-gradient(oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0 0) 1px, transparent 1px)",
               backgroundSize: "60px 60px",
             }} />
        {/* Vertical rule — editorial accent */}
        <div className="absolute left-[10%] top-0 bottom-0 w-px opacity-10"
             style={{ background: "oklch(0.6 0.1 155)" }} />
      </div>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg flex items-center justify-center"
               style={{ background: "oklch(0.45 0.13 155 / 30%)", border: "1px solid oklch(0.55 0.13 155 / 40%)" }}>
            <TreePine className="size-4" style={{ color: "oklch(0.70 0.14 155)" }} />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-display)", color: "oklch(0.80 0.08 155)" }}>
            ForestIA
          </span>
        </div>
        <Link href="/login"
              className="text-xs font-medium px-4 py-2 rounded-full transition-all"
              style={{ color: "oklch(0.75 0.10 155)", border: "1px solid oklch(0.40 0.08 155)" }}>
          Entrar
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-20 text-center">

        {/* Kicker */}
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-8 text-[11px] font-semibold tracking-widest uppercase"
             style={{ background: "oklch(0.45 0.13 155 / 20%)", border: "1px solid oklch(0.55 0.13 155 / 35%)", color: "oklch(0.70 0.14 155)" }}>
          <span className="size-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.70 0.14 155)" }} />
          Plataforma Geoespacial Florestal
        </div>

        {/* Main headline — Syne display font */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)", color: "oklch(0.96 0.012 80)" }}>
          Gestão<br />
          <span style={{ color: "oklch(0.62 0.15 155)" }}>Florestal</span><br />
          Inteligente
        </h1>

        {/* Subheadline */}
        <p className="max-w-lg text-base sm:text-lg leading-relaxed mb-12"
           style={{ color: "oklch(0.68 0.040 155)" }}>
          Monitoramento geoespacial, índices espectrais via satélite e
          relatórios de viabilidade — tudo em uma plataforma integrada.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {!dbConfigured ? (
            <Link href="/setup"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2 font-semibold text-sm px-6")}
                  style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.17 0.05 155)" }}>
              Configurar sistema
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link href="/dashboard"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2 font-semibold text-sm px-6")}
                  style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.17 0.05 155)" }}>
              Acessar dashboard
              <ArrowRight className="size-4" />
            </Link>
          )}
          <Link href="/setup/db"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-sm px-6")}
                style={{ borderColor: "oklch(0.38 0.08 155)", color: "oklch(0.72 0.08 155)", background: "transparent" }}>
            Configurar banco
          </Link>
        </div>

        {/* DB warning */}
        {!dbConfigured && (
          <div className="mt-6 flex items-center gap-2 text-xs px-4 py-2 rounded-full"
               style={{ background: "oklch(0.75 0.13 75 / 12%)", color: "oklch(0.75 0.13 75)" }}>
            <AlertTriangle className="size-3.5 shrink-0" />
            Banco de dados não configurado — configure antes de continuar
          </div>
        )}

        {/* Feature pills */}
        <div className="mt-20 flex flex-wrap justify-center gap-3">
          {[
            { icon: Satellite, label: "Sentinel-2 · 10m" },
            { icon: BarChart3, label: "Índices espectrais NDVI / EVI / NDWI" },
            { icon: TreePine,  label: "Inventário florestal" },
          ].map(({ icon: Icon, label }) => (
            <div key={label}
                 className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
                 style={{ background: "oklch(0.22 0.05 155 / 60%)", border: "1px solid oklch(0.32 0.06 155 / 50%)", color: "oklch(0.68 0.08 155)" }}>
              <Icon className="size-3.5 opacity-70" />
              {label}
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 pb-8 text-center">
        <p className="text-[11px]" style={{ color: "oklch(0.40 0.04 155)" }}>
          UFPA · Gestão Florestal · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
