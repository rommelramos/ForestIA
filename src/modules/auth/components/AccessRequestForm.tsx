"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { accessRequestSchema, type AccessRequestInput } from "../schemas"

const ROLES = [
  { value: "gerente", label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "cliente", label: "Cliente" },
]

export function AccessRequestForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<AccessRequestInput>({
    resolver: zodResolver(accessRequestSchema),
  })

  async function onSubmit(data: AccessRequestInput) {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/auth/access-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (res.ok) {
      setSubmitted(true)
    } else {
      const json = await res.json()
      setError(json.error ?? "Erro ao enviar solicitação.")
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-green-700 font-semibold text-lg">Solicitação enviada!</p>
          <p className="text-muted-foreground text-sm">
            Sua solicitação foi registrada e será analisada pelo administrador. Você receberá um retorno em breve.
          </p>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Solicitar Acesso</CardTitle>
        <CardDescription>Preencha os dados para solicitar acesso ao ForestIA</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1">
            <Label>Nome completo</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Perfil solicitado</Label>
            <select
              {...register("requestedRole")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.requestedRole && <p className="text-sm text-red-500">{errors.requestedRole.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Justificativa</Label>
            <textarea
              {...register("justification")}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none"
              placeholder="Explique brevemente por que precisa de acesso..."
            />
            {errors.justification && <p className="text-sm text-red-500">{errors.justification.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar solicitação"}
          </Button>
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
            ← Voltar ao login
          </Link>
        </form>
      </CardContent>
    </Card>
  )
}
