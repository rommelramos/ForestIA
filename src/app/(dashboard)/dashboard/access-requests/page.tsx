import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { accessRequests } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const pending = list.filter((r) => r.status === "pending")

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Solicitações de Acesso</h1>
        {pending.length > 0 && (
          <Badge className="bg-yellow-500 text-white">{pending.length} pendente(s)</Badge>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Total: {list.length}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Nome</th>
                  <th className="text-left py-2 font-medium">E-mail</th>
                  <th className="text-left py-2 font-medium">Perfil</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Data</th>
                  <th className="text-left py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3 text-gray-600">{r.email}</td>
                    <td className="py-3"><Badge variant="outline">{ROLE_LABELS[r.requestedRole] ?? r.requestedRole}</Badge></td>
                    <td className="py-3">
                      <Badge className={STATUS_STYLES[r.status] ?? ""}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3">
                      {r.status === "pending" && (
                        <span className="text-xs text-green-700 hover:underline cursor-pointer">Revisar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
