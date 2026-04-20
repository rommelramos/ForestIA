"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ROLES = [
  { value: "admin",       label: "Administrador" },
  { value: "gerente",     label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "cliente",     label: "Cliente" },
]

export default function NewUserPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", role: "funcionario", password: "", isActive: true })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao criar usuário"); return }
      router.push("/dashboard/users")
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/users" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo usuário</h1>
      </div>

      <form onSubmit={submit} className="space-y-4 bg-white border rounded-xl p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <input required value={form.name} onChange={(e) => set("name", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Nome do usuário" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="email@empresa.com" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
          <select value={form.role} onChange={(e) => set("role", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial (opcional)</label>
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Mínimo 8 caracteres" minLength={8} />
          <p className="text-xs text-gray-400 mt-1">Deixe em branco para enviar link de convite ao usuário.</p>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)}
            className="rounded" />
          <label htmlFor="isActive" className="text-sm text-gray-700">Ativar conta imediatamente</label>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
          {loading ? "Criando..." : "Criar usuário"}
        </button>
      </form>
    </div>
  )
}
