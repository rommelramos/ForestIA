"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Plug, Search } from "lucide-react"

export default function IntegrationsPage() {
  const [sicarCode, setSicarCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: unknown; error?: string } | null>(null)

  async function onSicarSearch() {
    if (!sicarCode.trim()) return
    setLoading(true)
    setResult(null)
    const res = await fetch("/api/integrations/sicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: sicarCode }),
    })
    const json = await res.json()
    setLoading(false)
    setResult(json)
  }

  const integrations = [
    { name: "SICAR", org: "SFB/MMA", desc: "Recupera imóvel, área total e polígono pelo código CAR", status: "active" },
    { name: "MapBiomas API", org: "MapBiomas", desc: "Séries temporais de uso e cobertura do solo", status: "planned" },
    { name: "Sentinel-2", org: "ESA/Copernicus", desc: "Imagens de satélite para cálculo de índices de vegetação", status: "planned" },
    { name: "PRODES/DETER", org: "INPE", desc: "Alertas de desmatamento em tempo real", status: "planned" },
    { name: "IBAMA SISCOM", org: "IBAMA", desc: "Verificação de embargos e autos de infração", status: "planned" },
    { name: "FUNAI GeoServer", org: "FUNAI", desc: "Terras indígenas delimitadas e homologadas", status: "planned" },
  ]

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Integrações</h1>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="size-4" /> Consulta SICAR</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label>Código do imóvel (CAR)</Label>
              <Input value={sicarCode} onChange={(e) => setSicarCode(e.target.value)} placeholder="Ex: PA-1234567-ABCDEFGHIJ" />
            </div>
            <div className="flex items-end">
              <Button onClick={onSicarSearch} disabled={loading || !sicarCode}>{loading ? "Consultando..." : "Consultar"}</Button>
            </div>
          </div>
          {result && (
            result.success
              ? <Alert><AlertDescription><pre className="text-xs overflow-auto max-h-48">{JSON.stringify(result.data, null, 2)}</pre></AlertDescription></Alert>
              : <Alert variant="destructive"><AlertDescription>{result.error}</AlertDescription></Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((intg) => (
          <Card key={intg.name}>
            <CardContent className="py-4 flex items-start gap-3">
              <Plug className="size-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{intg.name}</p>
                  <Badge className={intg.status === "active" ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                    {intg.status === "active" ? "Ativo" : "Planejado"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{intg.org}</p>
                <p className="text-xs text-gray-600 mt-1">{intg.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
