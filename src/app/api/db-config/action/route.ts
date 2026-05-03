import { NextRequest, NextResponse } from "next/server"
import { createDatabase, dropAndRecreateDatabase, runMigrations } from "@/lib/db"
import { dbActionSchema } from "@/modules/db-config/schemas"
import { isDbConfigured } from "@/lib/env"
import { auth } from "../../../../../auth"

export async function POST(req: NextRequest) {
  // Once the app is set up, only admins may run DB actions (prevents DB wipe attacks).
  if (isDbConfigured()) {
    const session = await auth()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 403 })
    }
  }

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

    if (action === "migrate") {
      await runMigrations(credentials)
      return NextResponse.json({ success: true, databaseExists: true })
    }

    return NextResponse.json({ success: false, error: "Ação inválida" }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
