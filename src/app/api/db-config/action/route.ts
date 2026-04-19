import { NextRequest, NextResponse } from "next/server"
import { createDatabase, dropAndRecreateDatabase } from "@/lib/db"
import { dbActionSchema } from "@/modules/db-config/schemas"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = dbActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 })
    }

    const { action, credentials } = parsed.data

    if (action === "create") {
      await createDatabase(credentials)
      return NextResponse.json({ success: true, databaseExists: true })
    }

    if (action === "regenerate") {
      await dropAndRecreateDatabase(credentials)
      return NextResponse.json({ success: true, databaseExists: true })
    }

    return NextResponse.json({ success: false, error: "Ação inválida" }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
