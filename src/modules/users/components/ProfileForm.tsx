"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserData {
  id: string
  name: string | null
  email: string | null
  role: string
  allowGoogleLogin: boolean
}

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  funcionario: "Funcionário",
  cliente:     "Cliente",
}

export function ProfileForm({ user }: { user: UserData }) {
  const router = useRouter()
  const [name,            setName]            = useState(user.name ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword,     setNewPassword]     = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword && newPassword !== confirmPassword) {
      setError("A nova senha e a confirmação não coincidem")
      return
    }

    const body: Record<string, unknown> = {}
    if (name !== (user.name ?? "")) body.name = name
    if (newPassword) {
      body.currentPassword = currentPassword
      body.newPassword     = newPassword
    }

    if (Object.keys(body).length === 0) {
      setError("Nenhuma alteração detectada")
      return
    }

    setLoading(true)
    const res = await fetch("/api/profile", {
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
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error   && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800"><AlertDescription>Perfil atualizado com sucesso.</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle className="text-base">Informações da conta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={user.email ?? ""} disabled className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Input value={ROLE_LABELS[user.role] ?? user.role} disabled className="opacity-60" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alterar senha</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {user.allowGoogleLogin && (
            <p className="text-xs text-zinc-500">
              Se você usa o login com Google, defina uma senha abaixo para também poder entrar com e-mail e senha.
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Senha atual"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
          {loading ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  )
}
