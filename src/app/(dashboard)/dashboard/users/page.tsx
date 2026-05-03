import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { users } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Users, Plus } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  funcionario: "Funcionário",
  cliente:     "Cliente",
  pending:     "Pendente",
}

const ROLE_BADGE: Record<string, string> = {
  admin:       "bg-violet-50 text-violet-700 border-violet-200",
  gerente:     "bg-blue-50   text-blue-700   border-blue-200",
  funcionario: "bg-zinc-100  text-zinc-700   border-zinc-200",
  cliente:     "bg-amber-50  text-amber-700  border-amber-200",
  pending:     "bg-orange-50 text-orange-600 border-orange-200",
}

export const metadata = { title: "Usuários — ForestIA" }
export const dynamic   = "force-dynamic"

export default async function UsersPage() {
  const session = await auth()
  if (!["admin", "gerente"].includes(session?.user.role ?? "")) redirect("/dashboard")

  const db   = getDb()
  const list = await db.select({
    id: users.id, name: users.name, email: users.email,
    role: users.role, isActive: users.isActive, createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt)

  const activeCount = list.filter(u => u.isActive).length

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">
            Administração
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">Usuários</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {list.length} cadastrado{list.length !== 1 ? "s" : ""} · {activeCount} ativo{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/users/new"
          className={cn(buttonVariants(), "bg-emerald-600 hover:bg-emerald-700 shadow-sm gap-1.5 self-start")}
        >
          <Plus className="size-4" />
          Novo usuário
        </Link>
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <div className="size-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Users className="size-7 text-zinc-400" />
          </div>
          <p className="font-semibold text-zinc-700 text-sm">Nenhum usuário cadastrado</p>
          <p className="text-xs text-zinc-400 mt-1 mb-5">Adicione o primeiro usuário ao sistema</p>
          <Link href="/dashboard/users/new" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <Plus className="size-4" />
            Adicionar usuário
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">E-mail</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Perfil</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        ROLE_BADGE[u.role] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        u.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        <span className={cn("size-1.5 rounded-full mr-1.5", u.isActive ? "bg-emerald-500" : "bg-zinc-400")} />
                        {u.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
