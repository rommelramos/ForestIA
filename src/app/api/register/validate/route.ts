import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/drizzle"
import { inviteTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { withErrorHandling } from "@/lib/api/errors"

export const GET = withErrorHandling(async (req: NextRequest) => {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ valid: false, error: "Token não informado" })

  const db = getDb()
  const [invite] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token)).limit(1)

  if (!invite) return NextResponse.json({ valid: false, error: "Token não encontrado" })
  if (invite.usedAt) return NextResponse.json({ valid: false, error: "Este link já foi utilizado" })
  if (new Date() > new Date(invite.expiresAt)) return NextResponse.json({ valid: false, error: "Link expirado" })

  return NextResponse.json({ valid: true, role: invite.role, email: invite.email })
})
