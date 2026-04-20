"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TreePine, AlertCircle } from "lucide-react"
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm shadow-2xl shadow-black/40 p-8 space-y-6">

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <TreePine className="size-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">ForestIA</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Gestão Florestal Inteligente</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-zinc-300 text-xs font-medium">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20 h-9"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-zinc-300 text-xs font-medium">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20 h-9"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/40 transition-all"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">ou continue com</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-white gap-2"
        onClick={onGoogleSignIn}
        disabled={loading}
      >
        <svg className="size-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </Button>

      {/* Register link */}
      <p className="text-center text-xs text-zinc-600">
        Não tem acesso?{" "}
        <a href="/login/request-access" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          Solicitar acesso
        </a>
      </p>
    </div>
  )
}
