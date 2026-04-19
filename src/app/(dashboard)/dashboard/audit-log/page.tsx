import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { auditLogs, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Log de Auditoria — ForestIA" }
export const dynamic = "force-dynamic"

export default async function AuditLogPage() {
  const session = await auth()
  if (session?.user.role !== "admin") redirect("/dashboard")

  const db = getDb()
  const logs = await db
    .select({
      id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity,
      entityId: auditLogs.entityId, metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt, userName: users.name, userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(auditLogs.createdAt)
    .limit(200)

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Log de Auditoria</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Últimas {logs.length} ações</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Data</th>
                  <th className="text-left py-2 font-medium">Usuário</th>
                  <th className="text-left py-2 font-medium">Ação</th>
                  <th className="text-left py-2 font-medium">Entidade</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 font-mono text-xs">
                    <td className="py-2 text-gray-500">{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="py-2">{log.userName ?? log.userEmail ?? "—"}</td>
                    <td className="py-2 font-semibold text-green-800">{log.action}</td>
                    <td className="py-2 text-gray-600">{log.entity} #{log.entityId}</td>
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
