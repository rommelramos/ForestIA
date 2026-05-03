import { NextRequest, NextResponse } from "next/server"
import { testConnection, checkDatabaseExists } from "@/lib/db"
import { dbCredentialsSchema } from "@/modules/db-config/schemas"
import { isDbConfigured } from "@/lib/env"
import { auth } from "../../../../../auth"

export async function POST(req: NextRequest) {
  // Once the app is set up, only admins may probe DB connections (prevents SSRF).
  if (isDbConfigured()) {
    const session = await auth()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 403 })
    }
  }

  try {
    const body = await req.json()
    const parsed = dbCredentialsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 })
    }

    const credentials = parsed.data
    const connectionResult = await testConnection(credentials)

    if (!connectionResult.success) {
      return NextResponse.json(connectionResult)
    }

    const databaseExists = await checkDatabaseExists(credentials)

    return NextResponse.json({ success: true, databaseExists })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
