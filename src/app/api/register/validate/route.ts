import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/drizzle"
import { inviteTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { withErrorHandling } from "@/lib/api/errors"

// Single generic rejection for every invalid-token path.  Distinct error
// messages would let an attacker probe whether a token exists, is expired,
// or is already used — all three map to the same opaque response instead.
const INVALID = () => NextResponse.json({ valid: false })

export const GET = withErrorHandling(async (req: NextRequest) => {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return INVALID()

  const db = getDb()
  const [invite] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token)).limit(1)

  if (!invite)         return INVALID()
  if (invite.usedAt)   return INVALID()
  if (new Date() > new Date(invite.expiresAt)) return INVALID()

  return NextResponse.json({ valid: true, role: invite.role, email: invite.email })
})
