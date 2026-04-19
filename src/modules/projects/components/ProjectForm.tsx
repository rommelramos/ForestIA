"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { projectSchema, type ProjectInput } from "../schemas"

interface ProjectFormProps {
  defaultValues?: Partial<ProjectInput>
  projectId?: number
}

export function ProjectForm({ defaultValues, projectId }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!projectId

  const { register, handleSubmit, formState: { errors } } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  })

  async function onSubmit(data: ProjectInput) {
    setLoading(true)
    setError(null)
    const url = isEdit ? `/api/projects/${projectId}` : "/api/projects"
    const method = isEdit ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    setLoading(false)
    if (!res.ok) { setError("Erro ao salvar projeto."); return }
    const json = await res.json()
    router.push(`/dashboard/projects/${isEdit ? projectId : json.id}`)
    router.refresh()
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Editar Projeto" : "Novo Projeto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="space-y-1">
            <Label>Nome do projeto *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <textarea {...register("description")} rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Código SICAR</Label>
              <Input {...register("sicarCode")} placeholder="Ex: PA-1234567-ABCDE" />
            </div>
            <div className="space-y-1">
              <Label>Área (hectares)</Label>
              <Input type="number" step="0.01" {...register("areaHectares", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Município</Label>
              <Input {...register("municipality")} />
            </div>
            <div className="space-y-1">
              <Label>Estado (UF)</Label>
              <Input {...register("state")} maxLength={2} placeholder="PA" className="uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data de início</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1">
              <Label>Previsão de término</Label>
              <Input type="date" {...register("expectedEndDate")} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar projeto"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
