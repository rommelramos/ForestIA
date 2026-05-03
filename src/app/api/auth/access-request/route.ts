import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db/drizzle"
import { accessRequests } from "@/lib/db/schema"
import { accessRequestSchema } from "@/modules/auth/schemas"
import { dbErrorResponse } from "@/lib/api/errors"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = accessRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const db = getDb()
    const existing = await db
      .select({ id: accessRequests.id })
      .from(accessRequests)
      .where(eq(accessRequests.email, parsed.data.email))
      .limit(1)

    // If a request already exists for this email we silently succeed instead of
    // returning 409.  A 409 would let an attacker enumerate which e-mail
    // addresses have already requested access (email oracle).
    if (existing.length === 0) {
      await db.insert(accessRequests).values({
        name: parsed.data.name,
        email: parsed.data.email,
        requestedRole: parsed.data.requestedRole,
        justification: parsed.data.justification,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return dbErrorResponse(err)
  }
}
