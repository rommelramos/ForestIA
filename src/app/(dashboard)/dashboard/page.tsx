import { auth } from "../../../../auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, FileText, Map, Users } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  funcionario: "Funcionário",
  cliente: "Cliente",
}

export default async function DashboardPage() {
  const session = await auth()
  const role = session?.user.role ?? "funcionario"

  const cards = [
    { label: "Projetos Ativos", value: "—", icon: FolderKanban, roles: ["admin", "gerente", "funcionario", "cliente"] },
    { label: "Relatórios Gerados", value: "—", icon: FileText, roles: ["admin", "gerente", "funcionario", "cliente"] },
    { label: "Análises Geoespaciais", value: "—", icon: Map, roles: ["admin", "gerente", "funcionario"] },
    { label: "Usuários Ativos", value: "—", icon: Users, roles: ["admin", "gerente"] },
  ].filter((c) => c.roles.includes(role))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Bem-vindo, {session?.user.name}</p>
        </div>
        <Badge className="bg-green-700 text-white">{ROLE_LABELS[role]}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-500">{card.label}</CardTitle>
                <Icon className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
            {[
              { label: "Gestão de Usuários", roles: ["admin", "gerente"] },
              { label: "Bases Geoespaciais", roles: ["admin", "gerente", "funcionario"] },
              { label: "Análise Geoespacial", roles: ["admin", "gerente", "funcionario"] },
              { label: "Análise por Satélite", roles: ["admin", "gerente", "funcionario"] },
              { label: "Relatórios de Viabilidade", roles: ["admin", "gerente", "funcionario", "cliente"] },
              { label: "Gestão de Projetos", roles: ["admin", "gerente", "funcionario", "cliente"] },
              { label: "Novos Serviços", roles: ["admin", "gerente"] },
              { label: "Integrações", roles: ["admin", "gerente", "funcionario"] },
              { label: "Portal Cliente", roles: ["cliente"] },
            ]
              .filter((m) => m.roles.includes(role))
              .map((m) => (
                <div key={m.label} className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100">
                  <span className="size-2 rounded-full bg-green-500 shrink-0" />
                  {m.label}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
