import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { accessRequests, inviteTokens, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { InviteGenerator } from "@/modules/auth/components/InviteGenerator"
import { AccessRequestActions } from "@/modules/auth/components/AccessRequestActions"

export const metadata = { title: "Solicitações de Acesso — ForestIA" }
export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}
const STATUS_LABELS: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" }
const ROLE_LABELS: Record<string, string> = { gerente: "Gerente", funcionario: "Funcionário", cliente: "Cliente" }

export default async function AccessRequestsPage() {
  const session = await auth()
  if (session?.user.role !== "admin") redirect("/dashboard")

  const db = getDb()
  const list = await db.select().from(accessRequests).orderBy(accessRequests.createdAt)
  const invites = await db.select({ id: inviteTokens.id, token: inviteTokens.token, email: inviteTokens.email,
    role: inviteTokens.role, expiresAt: inviteTokens.expiresAt, usedAt: inviteTokens.usedAt, createdAt: inviteTokens.createdAt,
    creatorName: users.name })
    .from(inviteTokens)
    .leftJoin(users, eq(inviteTokens.createdBy, users.id))
    .orderBy(inviteTokens.createdAt)

  const pending = list.filter(r => r.status === "pending")
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Solicitações de Acesso</h1>
        {pending.length > 0 && <Badge className="bg-yellow-500 text-white">{pending.length} pendente(s)</Badge>}
      </div>

      {/* Invite generator */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Gerar link de convite</h2>
        <p className="text-xs text-gray-500 mb-4">Envie o link para um novo usuário completar seu cadastro. O acesso só é liberado após aprovação.</p>
        <InviteGenerator />
      </div>

      {/* Active invites */}
      {invites.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Links de convite gerados</h2>
          <div className="space-y-2">
            {invites.map((inv) => {
              const expired = new Date() > new Date(inv.expiresAt)
              const url = `${baseUrl}/register/${inv.token}`
              return (
                <div key={inv.id} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${inv.usedAt ? "bg-gray-50 opacity-60" : expired ? "bg-red-50" : "bg-green-50"}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${inv.usedAt ? "bg-gray-400" : expired ? "bg-red-400" : "bg-green-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {inv.email && <span className="font-medium">{inv.email}</span>}
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
                      {inv.usedAt && <span className="text-gray-400">Utilizado</span>}
                      {!inv.usedAt && expired && <span className="text-red-500">Expirado</span>}
                    </div>
                    <p className="text-gray-400 truncate mt-0.5">{url}</p>
                  </div>
                  {!inv.usedAt && !expired && (
                    <button onClick={() => navigator.clipboard?.writeText(url)}
                      className="text-xs px-2 py-1 border rounded hover:bg-white transition-colors flex-shrink-0">
                      📋 Copiar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Solicitações de acesso ({list.length})</h2>
        {list.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma solicitação.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  {["Nome","E-mail","Perfil","Status","Data","Ações"].map(h => (
                    <th key={h} className="text-left py-2 pr-4 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">{r.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{r.email}</td>
                    <td className="py-3 pr-4"><Badge variant="outline" className="text-xs">{ROLE_LABELS[r.requestedRole] ?? r.requestedRole}</Badge></td>
                    <td className="py-3 pr-4"><Badge className={STATUS_STYLES[r.status] ?? ""}>{STATUS_LABELS[r.status] ?? r.status}</Badge></td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3">
                      {r.status === "pending" && <AccessRequestActions requestId={r.id} email={r.email} role={r.requestedRole} name={r.name} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
