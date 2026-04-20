import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { servicePatterns, projects, aoiAnalyses, satelliteAnalyses, layerOverlaps } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Anthropic from "@anthropic-ai/sdk"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin","gerente","funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: "projectId obrigatório" }, { status: 400 })

  const db = getDb()

  // Gather project context
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })

  const patterns = await db.select().from(servicePatterns)
  const aoi      = await db.select().from(aoiAnalyses).where(eq(aoiAnalyses.projectId, projectId))
  const sat      = await db.select().from(satelliteAnalyses).where(eq(satelliteAnalyses.projectId, projectId))

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const context = `
Projeto: ${project.name}
Município: ${project.municipality ?? "não informado"}, ${project.state ?? ""}
Área: ${project.areaHectares ?? "não informada"} ha
SICAR: ${project.sicarCode ?? "não informado"}
Status: ${project.status}
Análises geoespaciais: ${aoi.length} análise(s)
Análises de satélite: ${sat.length} análise(s)
${sat.length > 0 ? `NDVI médio: ${(sat.reduce((s,a) => s + Number(a.ndvi ?? 0), 0) / sat.length).toFixed(3)}` : ""}
${sat.length > 0 ? `Classe de vegetação mais recente: ${sat[0]?.vegetationClass ?? "desconhecida"}` : ""}
`

  const patternsText = patterns.length > 0
    ? patterns.map((p, i) => `${i+1}. Situação: ${p.trigger}\n   Serviço sugerido: ${p.suggestedService}\n   Razão: ${p.rationale ?? "não informada"}`).join("\n\n")
    : "Nenhum padrão histórico cadastrado."

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Você é um especialista em gestão florestal e restauração ambiental no Brasil.

Com base no contexto do projeto abaixo e nos padrões históricos de serviços, sugira até 5 serviços florestais relevantes.

CONTEXTO DO PROJETO:
${context}

PADRÕES HISTÓRICOS DE SERVIÇOS:
${patternsText}

Responda SOMENTE com um JSON no formato:
{
  "suggestions": [
    {
      "service": "Nome do serviço",
      "rationale": "Justificativa baseada no contexto do projeto",
      "priority": "alta|media|baixa",
      "category": "restauração|monitoramento|licenciamento|consultoria|outros"
    }
  ]
}`,
    }],
  })

  try {
    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const json = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim())
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ error: "Erro ao processar resposta da IA" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const db = getDb()
  const list = await db.select().from(servicePatterns)
  return NextResponse.json(list)
}
