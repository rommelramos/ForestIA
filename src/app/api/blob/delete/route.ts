/**
 * Vercel Blob — delete a stored object by URL.
 *
 * Called when a layer that was uploaded to Vercel Blob is removed from a
 * project so we don't accumulate orphaned objects in storage.
 */
import { del } from "@vercel/blob"
import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"

export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let url: string | undefined
  try {
    const body = await request.json() as { url?: string }
    url = body.url
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Campo 'url' obrigatório" }, { status: 400 })
  }

  try {
    await del(url)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}
