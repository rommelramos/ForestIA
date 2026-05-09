import { Suspense } from "react"
import { LoginForm } from "@/modules/auth"
import { TreePine, Satellite, MapPin, BarChart3 } from "lucide-react"

export const metadata = { title: "Login — ForestIA" }

const FEATURES = [
  { icon: Satellite, text: "Análise espectral Sentinel-2 · 10m de resolução" },
  { icon: MapPin,    text: "Sobreposições GeoJSON e Shapefile em tempo real" },
  { icon: BarChart3, text: "Relatórios de viabilidade florestal com IA" },
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel — editorial brand side ───────────────────── */}
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 overflow-hidden"
           style={{ background: "oklch(0.17 0.05 155)" }}>

        {/* Atmospheric glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-20"
               style={{ background: "radial-gradient(circle, oklch(0.55 0.15 155) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full opacity-10"
               style={{ background: "radial-gradient(circle, oklch(0.78 0.13 75) 0%, transparent 70%)" }} />
          {/* Vertical editorial rule */}
          <div className="absolute right-0 top-0 bottom-0 w-px opacity-20"
               style={{ background: "linear-gradient(to bottom, transparent, oklch(0.6 0.12 155), transparent)" }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.06]"
               style={{
                 backgroundImage: "radial-gradient(circle, oklch(0.8 0 0) 1px, transparent 1px)",
                 backgroundSize: "28px 28px",
               }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-10 rounded-xl flex items-center justify-center"
               style={{ background: "oklch(0.45 0.13 155 / 30%)", border: "1px solid oklch(0.55 0.13 155 / 40%)" }}>
            <TreePine className="size-5" style={{ color: "oklch(0.70 0.14 155)" }} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-widest uppercase"
               style={{ fontFamily: "var(--font-display)", color: "oklch(0.90 0.015 80)" }}>
              ForestIA
            </p>
            <p className="text-[10px] tracking-widest uppercase"
               style={{ color: "oklch(0.50 0.06 155)" }}>
              Gestão Florestal
            </p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.25em] uppercase mb-4"
               style={{ color: "oklch(0.62 0.14 155)" }}>
              Plataforma Integrada
            </p>
            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.05]"
                style={{ fontFamily: "var(--font-display)", color: "oklch(0.95 0.012 80)" }}>
              Monitoramento<br />
              <span style={{ color: "oklch(0.62 0.15 155)" }}>geoespacial</span><br />
              de precisão
            </h2>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="mt-0.5 size-6 rounded-md flex items-center justify-center shrink-0"
                     style={{ background: "oklch(0.45 0.13 155 / 25%)" }}>
                  <Icon className="size-3.5" style={{ color: "oklch(0.65 0.14 155)" }} />
                </div>
                <span className="text-sm leading-snug" style={{ color: "oklch(0.62 0.040 155)" }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom caption */}
        <p className="relative z-10 text-[11px]" style={{ color: "oklch(0.35 0.04 155)" }}>
          UFPA · Engenharia Florestal · {new Date().getFullYear()}
        </p>
      </div>

      {/* ── Right panel — form ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-0"
           style={{ background: "oklch(0.985 0.006 80)" }}>

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div className="size-9 rounded-xl flex items-center justify-center"
               style={{ background: "oklch(0.45 0.13 155 / 15%)", border: "1px solid oklch(0.55 0.13 155 / 25%)" }}>
            <TreePine className="size-5" style={{ color: "oklch(0.45 0.13 155)" }} />
          </div>
          <span className="font-bold text-base tracking-widest uppercase"
                style={{ fontFamily: "var(--font-display)", color: "oklch(0.20 0.05 155)" }}>
            ForestIA
          </span>
        </div>

        <div className="w-full max-w-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
