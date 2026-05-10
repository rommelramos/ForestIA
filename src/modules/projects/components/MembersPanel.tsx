"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

const MEMBER_ROLES = [
  { value: "analyst",    label: "Analista" },
  { value: "consultant", label: "Consultor" },
  { value: "reviewer",   label: "Revisor" },
]

interface Member {
  id: number
  userId: string
  name: string | null
  email: string | null
  role: string
}

interface User {
  id: string
  name: string | null
  email: string | null
}

interface Props {
  projectId: number
  initialMembers: Member[]
  allUsers: User[]
}

export function MembersPanel({ projectId, initialMembers, allUsers }: Props) {
  const [members,    setMembers]    = useState<Member[]>(initialMembers)
  const [selectedId, setSelectedId] = useState("")
  const [addRole,    setAddRole]    = useState("analyst")
  const [adding,     setAdding]     = useState(false)
  const [removing,   setRemoving]   = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const memberIds = new Set(members.map(m => m.userId))
  const available = allUsers.filter(u => !memberIds.has(u.id))

  async function addMember() {
    if (!selectedId) return
    setAdding(true)
    setError(null)
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedId, role: addRole }),
    })
    setAdding(false)
    if (!res.ok) { setError("Erro ao adicionar membro"); return }
    const user = allUsers.find(u => u.id === selectedId)!
    setMembers(prev => [...prev, { id: Date.now(), userId: selectedId, name: user.name, email: user.email, role: addRole }])
    setSelectedId("")
  }

  async function removeMember(userId: string) {
    setRemoving(userId)
    setError(null)
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    setRemoving(null)
    if (!res.ok) { setError("Erro ao remover membro"); return }
    setMembers(prev => prev.filter(m => m.userId !== userId))
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>}

      {members.length === 0
        ? <p className="text-sm text-gray-400">Sem membros adicionados.</p>
        : members.map(m => (
          <div key={m.id} className="flex items-center justify-between text-sm gap-2">
            <div className="min-w-0">
              <span className="font-medium truncate block">{m.name ?? m.email}</span>
              {m.name && <span className="text-xs text-zinc-400 truncate block">{m.email}</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">
                {MEMBER_ROLES.find(r => r.value === m.role)?.label ?? m.role}
              </Badge>
              <button
                onClick={() => removeMember(m.userId)}
                disabled={removing === m.userId}
                title="Remover membro"
                className="size-6 flex items-center justify-center rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))
      }

      {available.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Adicionar membro</p>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="flex-1 min-w-0 h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecionar usuário…</option>
              {available.map(u => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
            <select
              value={addRole}
              onChange={e => setAddRole(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MEMBER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Button
              size="sm"
              onClick={addMember}
              disabled={!selectedId || adding}
              className={cn("h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1", (!selectedId || adding) && "opacity-50")}
            >
              <UserPlus className="size-3.5" />
              {adding ? "…" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
