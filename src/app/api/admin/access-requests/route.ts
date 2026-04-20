import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { eq } from "drizzle-orm"
import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { accessRequests, users, auditLogs } from "@/lib/db/schema"
import { z } from "zod"
import { withErrorHandling } from "@/lib/api/errors"

export const GET = withErrorHandling(async () => {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const db = getDb()
  const list = await db.select().from(accessRequests).orderBy(accessRequests.createdAt)
  return NextResponse.json(list)
})

const reviewSchema = z.object({
  id: z.number(),
  action: z.enum(["approve", "reject"]),
  temporaryPassword: z.string().min(8).optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const db = getDb()
  const [request] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, parsed.data.id))
    .limit(1)

  if (!request) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 })

  const status = parsed.data.action === "approve" ? "approved" : "rejected"
  await db.update(accessRequests).set({
    status,
    reviewedBy: session.user.id,
    reviewedAt: new Date(),
  }).where(eq(accessRequests.id, parsed.data.id))

  if (parsed.data.action === "approve") {
    const hash = parsed.data.temporaryPassword
      ? await bcrypt.hash(parsed.data.temporaryPassword, 12)
      : null
    const userId = uuidv4()
    await db.insert(users).values({
      id: userId,
      name: request.name,
      email: request.email,
      role: request.requestedRole,
      passwordHash: hash ?? undefined,
      isActive: true,
      allowGoogleLogin: true,
    })
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "access_request.approved",
      entity: "access_requests",
      entityId: String(parsed.data.id),
      metadata: { email: request.email, role: request.requestedRole },
    })
  }

  return NextResponse.json({ success: true })
})
