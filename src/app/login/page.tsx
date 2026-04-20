import { Suspense } from "react"
import { LoginForm } from "@/modules/auth"

export const metadata = { title: "Login — ForestIA" }

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 p-4">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 size-[400px] rounded-full bg-emerald-900/20 blur-[100px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
