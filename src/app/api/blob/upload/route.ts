/**
 * Vercel Blob — client-upload token handler
 *
 * The browser calls this endpoint to obtain a short-lived signed token,
 * then uploads the file directly to the Vercel Blob CDN without going
 * through a serverless function body limit.
 *
 * Required env var: BLOB_READ_WRITE_TOKEN (set in Vercel dashboard or .env.local)
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session || !["admin", "gerente", "funcionario"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // Fail fast with a clear message if the token is missing — avoids the
  // confusing CORS error the browser shows when Vercel returns 400 without
  // Access-Control-Allow-Origin headers.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:       "BLOB_READ_WRITE_TOKEN não configurado no servidor.",
        instruction: "Acesse Vercel Dashboard → ForestIA → Settings → Environment Variables e adicione o token do Blob Store.",
      },
      { status: 503 },
    )
  }

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => {
        return {
          // Accept GeoJSON, plain text, and ZIP (Shapefile bundles only).
          // Removed application/octet-stream — it's a catch-all that allows any file type.
          allowedContentTypes: [
            "application/json",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed",
          ],
          // 50 MB is sufficient for high-resolution shapefiles; 200 MB was excessive.
          maximumSizeInBytes: 50 * 1024 * 1024,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[blob] upload completed:", blob.url)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    const msg = (error as Error).message ?? "Erro ao gerar token de upload"
    console.error("[blob/upload] handleUpload error:", msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
