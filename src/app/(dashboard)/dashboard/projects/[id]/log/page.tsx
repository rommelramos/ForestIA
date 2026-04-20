import { auth } from "../../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { auditLogs, users } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function ProjectLogPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!["admin","gerente"].includes(session?.user.role ?? "")) {
    return <div className="p-6 text-gray-500 text-sm">Acesso restrito.</div>
  }

  const { id } = await params
  const db = getDb()

  const logs = await db
    .select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity,
              entityId: auditLogs.entityId, metadata: auditLogs.metadata, ip: auditLogs.ip,
              createdAt: auditLogs.createdAt, userName: users.name, userEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.projectId, Number(id)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(500)

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Log de Auditoria do Projeto</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          🔒 Somente leitura · {logs.length} entradas
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🔒</p>
          <p className="text-sm">Nenhuma ação registrada para este projeto.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Data/hora","Usuário","Ação","Entidade","ID","IP"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-mono">
                    {new Date(l.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{l.userName ?? l.userEmail ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{l.action}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{l.entity ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{l.entityId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{l.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
