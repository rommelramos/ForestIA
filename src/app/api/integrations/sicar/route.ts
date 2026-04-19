import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { z } from "zod"

const sicarSchema = z.object({ code: z.string().min(10, "Código SICAR inválido") })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = sicarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const apiUrl = `https://car.gov.br/publico/imoveis/index?imovel_id=${parsed.data.code}`
    const res = await fetch(apiUrl, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(15000) })

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: "SICAR não retornou dados para este código. Verifique se o código está correto.",
      })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({
      success: false,
      error: "Não foi possível consultar o SICAR. Verifique a conexão ou tente novamente.",
    })
  }
}
