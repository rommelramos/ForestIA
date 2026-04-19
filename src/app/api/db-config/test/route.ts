import { NextRequest, NextResponse } from "next/server"
import { testConnection, checkDatabaseExists } from "@/lib/db"
import { dbCredentialsSchema } from "@/modules/db-config/schemas"

export async function POST(req: NextRequest) {
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
