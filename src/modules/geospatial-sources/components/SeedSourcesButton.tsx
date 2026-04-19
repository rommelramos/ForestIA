"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export function SeedSourcesButton({ variant }: { variant?: "prominent" }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSeed() {
    setLoading(true)
    await fetch("/api/geospatial-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedPublicSources: true }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <Button
      onClick={onSeed}
      disabled={loading}
      variant={variant === "prominent" ? "default" : "outline"}
      className={variant === "prominent" ? "bg-green-700 hover:bg-green-800" : ""}
    >
      {loading ? "Importando..." : "Importar fontes públicas (IBGE, INPE, MapBiomas...)"}
    </Button>
  )
}
