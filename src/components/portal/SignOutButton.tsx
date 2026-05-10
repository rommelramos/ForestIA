"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
      style={{
        color:  "oklch(0.48 0.06 155)",
        border: "1px solid oklch(0.85 0.02 155)",
      }}
    >
      <LogOut className="size-3.5" />
      <span className="hidden sm:inline">Sair</span>
    </button>
  )
}
