import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { users } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", gerente: "Gerente", funcionario: "Funcionário", cliente: "Cliente", pending: "Pendente",
}

export const metadata = { title: "Usuários — ForestIA" }
export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const session = await auth()
  if (!["admin", "gerente"].includes(session?.user.role ?? "")) redirect("/dashboard")

  const db = getDb()
  const list = await db.select({
    id: users.id, name: users.name, email: users.email,
    role: users.role, isActive: users.isActive, createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <a href="/dashboard/users/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-medium text-white hover:bg-green-800 transition-colors">
          + Novo usuário
        </a>
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
                  <th className="text-left py-2 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{u.name}</td>
                    <td className="py-3 text-gray-600">{u.email}</td>
                    <td className="py-3">
                      <Badge variant="outline">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge className={u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {u.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
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
