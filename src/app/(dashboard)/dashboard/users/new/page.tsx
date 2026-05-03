"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react"

const ROLES = [
  { value: "admin",       label: "Administrador" },
  { value: "gerente",     label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "cliente",     label: "Cliente" },
]

export default function NewUserPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ name: "", email: "", role: "funcionario", password: "", isActive: true })
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar usuário")
        toast.error(data.error ?? "Erro ao criar usuário")
        return
      }
      setDone(true)
      toast.success("Usuário criado com sucesso!")
      setTimeout(() => router.push("/dashboard/users"), 800)
    } catch {
      setError("Erro de conexão. Verifique a rede e tente novamente.")
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-lg mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/users" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Administração</p>
          <h1 className="text-xl font-bold text-zinc-900 leading-tight">Novo usuário</h1>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────── */}
      <form onSubmit={submit} className="space-y-5 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm">

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="Nome do usuário"
            disabled={loading || done}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            required
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="email@empresa.com"
            disabled={loading || done}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Perfil de acesso</Label>
          <select
            id="role"
            value={form.role}
            onChange={e => set("role", e.target.value)}
            disabled={loading || done}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha inicial <span className="text-zinc-400 font-normal">(opcional)</span></Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={e => set("password", e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            disabled={loading || done}
          />
          <p className="text-xs text-zinc-400">Deixe em branco para enviar link de convite ao usuário.</p>
        </div>

        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={e => set("isActive", e.target.checked)}
            disabled={loading || done}
            className="size-4 rounded border-zinc-300 accent-emerald-600 cursor-pointer disabled:opacity-50"
          />
          <label htmlFor="isActive" className="text-sm text-zinc-700 cursor-pointer select-none">
            Ativar conta imediatamente
          </label>
        </div>

        {/* Error feedback */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <span className="mt-0.5 size-4 shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">!</span>
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || done}
          className={cn(
            "w-full gap-2 transition-all",
            done
              ? "bg-emerald-500 hover:bg-emerald-500 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white",
          )}
        >
          {done ? (
            <><CheckCircle2 className="size-4" /> Criado com sucesso!</>
          ) : loading ? (
            <><Spinner size="sm" className="text-white/80" /> Criando usuário…</>
          ) : (
            <><UserPlus className="size-4" /> Criar usuário</>
          )}
        </Button>
      </form>
    </div>
  )
}
