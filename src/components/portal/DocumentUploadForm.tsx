"use client"

import { useState, useRef } from "react"
import { Paperclip, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function DocumentUploadForm({ projectId }: { projectId: number }) {
  const [name, setName]         = useState("")
  const [description, setDesc]  = useState("")
  const [file, setFile]         = useState<File | null>(null)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    try {
      // 1. Upload do arquivo para blob
      const blobRes = await fetch(`/api/blob/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      })
      if (!blobRes.ok) throw new Error("Falha ao enviar arquivo")
      const { url } = await blobRes.json() as { url: string }

      // 2. Salvar metadados no banco
      const res = await fetch("/api/portal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: name || file.name,
          description,
          url,
          mimeType: file.type,
          sizeBytes: file.size,
          category: "client_upload",
        }),
      })
      if (!res.ok) throw new Error("Falha ao registrar documento")

      setDone(true)
      toast.success("Documento enviado com sucesso")
      setName(""); setDesc(""); setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      setTimeout(() => { setDone(false); window.location.reload() }, 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar documento")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: "oklch(0.98 0.004 155)",
    border: "1px solid oklch(0.84 0.020 155)",
    color: "oklch(0.16 0.015 155)",
    borderRadius: "0.625rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                 style={{ color: "oklch(0.42 0.06 155)" }}>
            Nome do documento
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Matrícula do imóvel"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                 style={{ color: "oklch(0.42 0.06 155)" }}>
            Descrição (opcional)
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Breve descrição..."
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
               style={{ color: "oklch(0.42 0.06 155)" }}>
          Arquivo <span style={{ color: "oklch(0.65 0.14 25)" }}>*</span>
        </label>
        <label
          className="flex items-center gap-3 cursor-pointer rounded-[0.625rem] px-4 py-3 transition-colors"
          style={{ background: "oklch(0.98 0.004 155)", border: "1.5px dashed oklch(0.78 0.04 155)" }}
        >
          <Paperclip className="size-4 shrink-0" style={{ color: "oklch(0.55 0.08 155)" }} />
          <span className="text-sm" style={{ color: file ? "oklch(0.20 0.05 155)" : "oklch(0.58 0.04 155)" }}>
            {file ? file.name : "Clique para selecionar um arquivo"}
          </span>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.geojson,.zip,.kml"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!file || loading || done}
        className="flex items-center gap-2 px-5 py-2.5 rounded-[0.625rem] text-sm font-semibold transition-all disabled:opacity-60"
        style={{ background: "oklch(0.45 0.13 155)", color: "white" }}
      >
        {done ? (
          <><CheckCircle2 className="size-4" /> Enviado!</>
        ) : loading ? (
          <><Loader2 className="size-4 animate-spin" /> Enviando...</>
        ) : (
          "Enviar documento"
        )}
      </button>
    </form>
  )
}
