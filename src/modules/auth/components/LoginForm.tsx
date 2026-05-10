"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { loginSchema, type LoginInput } from "../schemas"

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin:    "E-mail ou senha incorretos.",
  PendingApproval:      "Sua conta está aguardando aprovação do administrador.",
  OAuthAccountNotLinked:"E-mail já cadastrado com outro método de login.",
}

export function LoginForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const errorParam  = params.get("error")
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? "Ocorreu um erro. Tente novamente.") : null
  )

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    setError(null)
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? "E-mail ou senha incorretos.")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  async function onGoogleSignIn() {
    setLoading(true)
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="space-y-7">

      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "oklch(0.16 0.015 155)" }}>
          Bem-vindo de volta
        </h1>
        <p className="text-sm" style={{ color: "oklch(0.48 0.05 155)" }}>
          Acesse sua conta para continuar
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
             style={{ background: "oklch(0.96 0.015 25 / 60%)", border: "1px solid oklch(0.80 0.08 25 / 50%)", color: "oklch(0.45 0.12 25)" }}>
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email"
                 className="text-xs font-semibold tracking-wide uppercase"
                 style={{ color: "oklch(0.38 0.06 155)" }}>
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className="h-10 text-sm transition-shadow"
            style={{
              background:   "oklch(1 0 0)",
              border:       "1px solid oklch(0.82 0.025 155)",
              color:        "oklch(0.16 0.015 155)",
              borderRadius: "0.625rem",
            }}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs" style={{ color: "oklch(0.50 0.14 25)" }}>{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password"
                 className="text-xs font-semibold tracking-wide uppercase"
                 style={{ color: "oklch(0.38 0.06 155)" }}>
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-10 text-sm transition-shadow"
            style={{
              background:   "oklch(1 0 0)",
              border:       "1px solid oklch(0.82 0.025 155)",
              color:        "oklch(0.16 0.015 155)",
              borderRadius: "0.625rem",
            }}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs" style={{ color: "oklch(0.50 0.14 25)" }}>{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-[0.625rem] text-sm font-semibold tracking-wide transition-all disabled:opacity-60"
          style={{
            background: loading
              ? "oklch(0.40 0.10 155)"
              : "oklch(0.45 0.13 155)",
            color: "oklch(0.97 0.008 80)",
            boxShadow: "0 4px 14px oklch(0.45 0.13 155 / 30%)",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.02 155)" }} />
        <span className="text-[11px] font-medium tracking-wider uppercase"
              style={{ color: "oklch(0.58 0.04 155)" }}>
          ou continue com
        </span>
        <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.02 155)" }} />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={loading}
        className="w-full h-10 rounded-[0.625rem] flex items-center justify-center gap-2.5 text-sm font-medium transition-all disabled:opacity-60"
        style={{
          background: "oklch(1 0 0)",
          border:     "1px solid oklch(0.82 0.025 155)",
          color:      "oklch(0.25 0.03 155)",
        }}
      >
        <svg className="size-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </button>

      {/* Register link */}
      <p className="text-center text-sm" style={{ color: "oklch(0.50 0.04 155)" }}>
        Não tem acesso?{" "}
        <a href="/login/request-access"
           className="font-semibold transition-opacity hover:opacity-70"
           style={{ color: "oklch(0.45 0.13 155)" }}>
          Solicitar acesso
        </a>
      </p>
    </div>
  )
}
