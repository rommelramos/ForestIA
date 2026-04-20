"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

interface TokenInfo {
  valid: boolean
  role?: string
  email?: string
  error?: string
}

export default function RegisterPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [info, setInfo]     = useState<TokenInfo | null>(null)
  const [form, setForm]     = useState({ name: "", email: "", password: "", confirm: "" })
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)

  useEffect(() => {
    fetch(`/api/register/validate?token=${token}`)
      .then(r => r.json())
      .then(setInfo)
  }, [token])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError("As senhas não conferem"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: form.name, email: form.email || info?.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao registrar"); return }
      setDone(true)
    } catch { setError("Erro de conexão") }
    finally { setLoading(false) }
  }

  if (!info) return <div className="min-h-screen flex items-center justify-center text-gray-400">Validando convite...</div>

  if (!info.valid) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white border rounded-xl p-8 max-w-md w-full text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <h2 className="font-bold text-gray-900 mb-2">Link inválido ou expirado</h2>
        <p className="text-sm text-gray-500">{info.error ?? "Este link de convite não é válido."}</p>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white border rounded-xl p-8 max-w-md w-full text-center">
        <p className="text-4xl mb-3">✅</p>
        <h2 className="font-bold text-gray-900 mb-2">Cadastro enviado!</h2>
        <p className="text-sm text-gray-500">Seu cadastro está aguardando aprovação. Você receberá acesso após confirmação pelo administrador.</p>
        <button onClick={() => router.push("/login")} className="mt-4 text-sm text-green-700 hover:underline">
          Ir para o login
        </button>
      </div>
    </div>
  )

  const ROLE_LABELS: Record<string, string> = { funcionario: "Funcionário", gerente: "Gerente", cliente: "Cliente" }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border rounded-xl shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">🌲</p>
          <h1 className="text-2xl font-bold text-gray-900">ForestIA</h1>
          <p className="text-sm text-gray-500 mt-1">
            Você foi convidado como <strong>{ROLE_LABELS[info.role ?? "funcionario"] ?? info.role}</strong>
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input required value={form.name} onChange={e => set("name", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Seu nome completo" />
          </div>

          {!info.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input required type="email" value={form.email} onChange={e => set("email", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          )}
          {info.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input disabled value={info.email} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input required type="password" value={form.password} onChange={e => set("password", e.target.value)}
              minLength={8} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Mínimo 8 caracteres" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
            <input required type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
            {loading ? "Registrando..." : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  )
}
