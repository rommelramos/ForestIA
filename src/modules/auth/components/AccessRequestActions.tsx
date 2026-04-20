"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function AccessRequestActions({ requestId, email, role, name }: { requestId: number; email: string; role: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function act(action: "approve" | "reject") {
    setLoading(true)
    try {
      await fetch(`/api/access-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, role, name }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="flex gap-1">
      <button onClick={() => act("approve")} disabled={loading}
        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors">
        ✓ Aprovar
      </button>
      <button onClick={() => act("reject")} disabled={loading}
        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors">
        ✕ Rejeitar
      </button>
    </div>
  )
}
