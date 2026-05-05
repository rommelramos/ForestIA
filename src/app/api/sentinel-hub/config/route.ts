/**
 * GET /api/sentinel-hub/config
 *
 * Returns whether Sentinel Hub credentials are configured server-side.
 * The client uses this to decide whether to show/enable the SH provider chip.
 *
 * Required env vars: SENTINEL_HUB_CLIENT_ID, SENTINEL_HUB_CLIENT_SECRET
 */

import { NextResponse }      from "next/server"
import { withErrorHandling } from "@/lib/api/errors"
import { auth }              from "../../../../../auth"

export const GET = withErrorHandling(async () => {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const configured = !!(
    process.env.SENTINEL_HUB_CLIENT_ID &&
    process.env.SENTINEL_HUB_CLIENT_SECRET
  )

  return NextResponse.json({ configured })
})
