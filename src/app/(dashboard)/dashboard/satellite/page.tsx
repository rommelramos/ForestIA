import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Análise por Satélite — ForestIA" }

export default function satellitePage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Análise por Satélite</h1>
        <Badge variant="outline" className="text-yellow-700 border-yellow-300">Em desenvolvimento</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-600">Módulo 4 — Análise por satélite e índices de vegetação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-500 space-y-2">
          <p>Este módulo está estruturado e pronto para implementação.</p>
          <p>A estrutura de dados já está definida no schema do banco de dados.</p>
        </CardContent>
      </Card>
    </div>
  )
}
