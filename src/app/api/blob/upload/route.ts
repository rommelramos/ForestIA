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

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => {
        // Only allow GeoJSON / plain-text uploads; cap at 200 MB
        return {
          allowedContentTypes: ["application/json", "text/plain"],
          maximumSizeInBytes:  200 * 1024 * 1024,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: log or record the completed upload
        console.log("[blob] upload completed:", blob.url)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}
