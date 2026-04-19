import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Dashboard — ForestIA" }

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Áreas Monitoradas", value: "—" },
          { label: "Registros de Monitoramento", value: "—" },
          { label: "Relatórios de Viabilidade", value: "—" },
          { label: "Consultores Ativos", value: "—" },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulos em desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-500 text-sm space-y-1">
          <p>• Gestão de Áreas Florestais</p>
          <p>• Monitoramento Geoespacial</p>
          <p>• Relatórios de Viabilidade</p>
          <p>• Avaliação de Consultores</p>
        </CardContent>
      </Card>
    </div>
  )
}
