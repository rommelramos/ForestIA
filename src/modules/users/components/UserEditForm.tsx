"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const ROLES = [
  { value: "admin",       label: "Administrador" },
  { value: "gerente",     label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "cliente",     label: "Cliente" },
]

interface UserData {
  id: string
  name: string | null
  email: string | null
  role: string
  isActive: boolean
  allowGoogleLogin: boolean
}

export function UserEditForm({ user }: { user: UserData }) {
  const router = useRouter()
  const [name,             setName]             = useState(user.name ?? "")
  const [role,             setRole]             = useState(user.role)
  const [isActive,         setIsActive]         = useState(user.isActive)
  const [allowGoogleLogin, setAllowGoogleLogin] = useState(user.allowGoogleLogin)
  const [password,         setPassword]         = useState("")
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)
  const [success,          setSuccess]          = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const body: Record<string, unknown> = { name, role, isActive, allowGoogleLogin }
    if (password) body.password = password

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setLoading(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? "Erro ao salvar")
      return
    }
    setSuccess(true)
    setPassword("")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error   && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800"><AlertDescription>Salvo com sucesso.</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do usuário</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required minLength={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Usuário ativo</p>
              <p className="text-xs text-zinc-500">Usuários inativos não conseguem fazer login</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                isActive ? "bg-emerald-500" : "bg-zinc-300"
              )}
            >
              <span className={cn("inline-block size-4 rounded-full bg-white shadow transition-transform", isActive ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Login com Google</p>
              <p className="text-xs text-zinc-500">Permite autenticação via conta Google</p>
            </div>
            <button
              type="button"
              onClick={() => setAllowGoogleLogin(v => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                allowGoogleLogin ? "bg-emerald-500" : "bg-zinc-300"
              )}
            >
              <span className={cn("inline-block size-4 rounded-full bg-white shadow transition-transform", allowGoogleLogin ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Redefinir senha</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-zinc-500">Deixe em branco para não alterar a senha atual.</p>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={password ? 8 : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
          {loading ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
