"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertTriangle, Circle } from "lucide-react"

const STATUS_CONFIG = {
  pending:     { label: "Não iniciada", icon: Circle,       color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "Em andamento", icon: Clock,        color: "bg-blue-100 text-blue-700" },
  completed:   { label: "Concluída",    icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  delayed:     { label: "Atrasada",     icon: AlertTriangle,color: "bg-red-100 text-red-700" },
} as const

type StageStatus = keyof typeof STATUS_CONFIG

interface Stage {
  id: number
  name: string
  description?: string | null
  order: number
  status: string
  assignedTo?: string | null
  dueDate?: string | Date | null
}

interface StageBoardProps {
  projectId: number
  stages: Stage[]
  canEdit: boolean
}

export function StageBoard({ projectId, stages: initial, canEdit }: StageBoardProps) {
  const [stages, setStages] = useState(initial)

  async function updateStatus(stageId: number, status: StageStatus) {
    const res = await fetch(`/api/projects/${projectId}/stages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, status }),
    })
    if (res.ok) {
      setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, status } : s))
    }
  }

  if (stages.length === 0) {
    return <p className="text-gray-500 text-sm">Nenhuma etapa cadastrada para este projeto.</p>
  }

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const cfg = STATUS_CONFIG[stage.status as StageStatus] ?? STATUS_CONFIG.pending
        const Icon = cfg.icon
        return (
          <Card key={stage.id} className="border-l-4 border-l-green-500">
            <CardContent className="py-3 flex items-center gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-800 font-bold text-xs shrink-0">
                {stage.order}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{stage.name}</p>
                {stage.description && <p className="text-xs text-gray-500 truncate">{stage.description}</p>}
                {stage.dueDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Prazo: {new Date(stage.dueDate).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cfg.color}>
                  <Icon className="size-3 mr-1" />
                  {cfg.label}
                </Badge>
                {canEdit && (
                  <select
                    value={stage.status}
                    onChange={(e) => updateStatus(stage.id, e.target.value as StageStatus)}
                    className="text-xs border rounded px-1 py-0.5 bg-white"
                  >
                    {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
