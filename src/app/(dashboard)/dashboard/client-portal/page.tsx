import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Portal do Cliente — ForestIA" }

export default function clientportalPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Portal do Cliente</h1>
        <Badge variant="outline" className="text-yellow-700 border-yellow-300">Em desenvolvimento</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-600">Módulo 9 — Portal de acesso para clientes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-500 space-y-2">
          <p>Este módulo está estruturado e pronto para implementação.</p>
          <p>A estrutura de dados já está definida no schema do banco de dados.</p>
        </CardContent>
      </Card>
    </div>
  )
}
