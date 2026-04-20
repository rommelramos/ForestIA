"use client"

import { useState } from "react"
import type { DbCredentialsInput, TestConnectionResponse } from "../schemas"

type Status = "idle" | "testing" | "success" | "error"

export function useDbConfig() {
  const [status, setStatus] = useState<Status>("idle")
  const [response, setResponse] = useState<TestConnectionResponse | null>(null)

  async function testConnection(credentials: DbCredentialsInput): Promise<TestConnectionResponse> {
    setStatus("testing")
    setResponse(null)
    try {
      const res = await fetch("/api/db-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      })
      const data: TestConnectionResponse = await res.json()
      setStatus(data.success ? "success" : "error")
      setResponse(data)
      return data
    } catch {
      const err: TestConnectionResponse = { success: false, error: "Falha na requisição" }
      setStatus("error")
      setResponse(err)
      return err
    }
  }

  async function executeDbAction(action: "create" | "regenerate", credentials: DbCredentialsInput): Promise<TestConnectionResponse> {
    setStatus("testing")
    try {
      const res = await fetch("/api/db-config/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, credentials }),
      })
      const data: TestConnectionResponse = await res.json()
      setStatus(data.success ? "success" : "error")
      setResponse(data)
      return data
    } catch {
      const err: TestConnectionResponse = { success: false, error: "Falha na requisição" }
      setStatus("error")
      setResponse(err)
      return err
    }
  }

  return { status, response, testConnection, executeDbAction }
}
