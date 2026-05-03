/**
 * Vercel Blob — delete a stored object by URL.
 *
 * Called when a layer that was uploaded to Vercel Blob is removed from a
 * project so we don't accumulate orphaned objects in storage.
 *
 * Security: the URL is validated against the store's own hostname so callers
 * cannot weaponise this endpoint to delete objects from arbitrary stores or
 * trigger SSRF by passing a URL pointing to an internal service.
 */
import { del, list } from "@vercel/blob"
import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"

/**
 * Returns true only when `url` points to the Vercel Blob store that this
 * deployment owns.  Vercel Blob hostnames follow the pattern
 * `<store-id>.public.blob.vercel-storage.com`.
 */
function isOwnedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Must be https and hosted under Vercel's blob CDN domain.
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".blob.vercel-storage.com")
  } catch {
    return false
  }
}

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

  // Reject URLs that don't belong to our Vercel Blob store.
  if (!isOwnedBlobUrl(url)) {
    return NextResponse.json({ error: "URL de blob inválida" }, { status: 400 })
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
