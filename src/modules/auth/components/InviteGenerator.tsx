"use client"
import { useState } from "react"

const ROLES = [{ value: "funcionario", label: "Funcionário" }, { value: "gerente", label: "Gerente" }, { value: "cliente", label: "Cliente" }]

export function InviteGenerator() {
  const [email,    setEmail]    = useState("")
  const [role,     setRole]     = useState("funcionario")
  const [days,     setDays]     = useState(7)
  const [result,   setResult]   = useState<{ inviteUrl: string; expiresAt: string } | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  async function generate() {
    setLoading(true); setResult(null)
    try {
      const res = await fetch("/api/access-requests/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, role, expiresInDays: days }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
    } finally { setLoading(false) }
  }

  function copy() {
    if (!result) return
    navigator.clipboard?.writeText(result.inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email"
          placeholder="E-mail (opcional)"
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-green-400" />
        <select value={role} onChange={e => setRole(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
          {[1,3,7,14,30].map(d => <option key={d} value={d}>{d} dia(s)</option>)}
        </select>
        <button onClick={generate} disabled={loading}
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50 transition-colors">
          {loading ? "Gerando..." : "🔗 Gerar link"}
        </button>
      </div>

      {result && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-sm text-green-800 flex-1 font-mono truncate">{result.inviteUrl}</span>
          <button onClick={copy} className="text-xs px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 flex-shrink-0">
            {copied ? "✓ Copiado!" : "📋 Copiar"}
          </button>
          <span className="text-xs text-gray-400 flex-shrink-0">
            Expira: {new Date(result.expiresAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}
    </div>
  )
}
