"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, MapPin } from "lucide-react"

interface AoiUploadFormProps { projectId?: number }

export function AoiUploadForm({ projectId }: AoiUploadFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState(projectId?.toString() ?? "")
  const [geojson, setGeojson] = useState("")
  const [fileName, setFileName] = useState("")

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setGeojson(text)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || !geojson) { setError("Selecione o projeto e carregue um arquivo GeoJSON/KML."); return }
    setLoading(true)
    setError(null)
    const res = await fetch("/api/aoi-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(selectedProject), geojson, sourceType: "upload", uploadedFile: fileName }),
    })
    setLoading(false)
    if (res.ok) { router.refresh() } else { setError("Erro ao enviar análise.") }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="size-4" /> Nova Análise de Área de Interesse</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {!projectId && (
            <div className="space-y-1">
              <Label>ID do Projeto</Label>
              <Input type="number" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} placeholder="Informe o ID do projeto" />
            </div>
          )}
          <div className="space-y-1">
            <Label>Arquivo GeoJSON / KML / KMZ</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <Upload className="size-4" />
                {fileName || "Selecionar arquivo"}
                <input type="file" accept=".geojson,.json,.kml,.kmz" onChange={handleFileChange} className="hidden" />
              </label>
              {fileName && <span className="text-xs text-gray-500 truncate max-w-xs">{fileName}</span>}
            </div>
          </div>
          <p className="text-xs text-gray-400">Formatos suportados: GeoJSON, KML, KMZ. O polígono da área de interesse será cruzado com as bases geoespaciais cadastradas.</p>
          <Button type="submit" disabled={loading || !geojson}>{loading ? "Enviando..." : "Iniciar análise"}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
