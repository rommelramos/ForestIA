import { NextResponse } from "next/server"

// ─── DB error classification ──────────────────────────────────────────────────

interface DbErrorMeta {
  userMessage: string
  code: string
}

function extractCause(err: unknown): unknown {
  return err instanceof Error && err.cause ? err.cause : err
}

function errno(err: unknown): number {
  const e = extractCause(err) as Record<string, unknown>
  return typeof e?.errno === "number" ? e.errno : 0
}

function errcode(err: unknown): string {
  const e = extractCause(err) as Record<string, unknown>
  return typeof e?.code === "string" ? e.code : "UNKNOWN"
}

function errMessage(err: unknown): string {
  const cause = extractCause(err)
  if (cause instanceof Error) return cause.message
  if (err instanceof Error) return err.message
  return String(err)
}

export function classifyDbError(err: unknown): DbErrorMeta {
  const no = errno(err)
  const code = errcode(err)

  switch (no) {
    case 1062: return { userMessage: "Registro duplicado — este dado já existe no sistema.", code: "DUPLICATE_ENTRY" }
    case 1451: return { userMessage: "Não é possível remover — outros registros dependem deste item.", code: "REFERENCED_ROW" }
    case 1452: return { userMessage: "Referência inválida — o dado relacionado não foi encontrado.", code: "FOREIGN_KEY_VIOLATION" }
    case 1054: return { userMessage: "Estrutura do banco desatualizada. Acesse /setup/db e execute 'Regenerar Banco'.", code: "UNKNOWN_COLUMN" }
    case 1406: return { userMessage: "Valor muito longo para o campo.", code: "DATA_TOO_LONG" }
    case 1292: return { userMessage: "Valor inválido para o tipo de campo.", code: "INVALID_VALUE" }
    case 2002:
    case 2003: return { userMessage: "Não foi possível conectar ao banco de dados.", code: "CONNECTION_FAILED" }
    case 1045: return { userMessage: "Acesso negado ao banco de dados. Verifique as credenciais.", code: "ACCESS_DENIED" }
    default:   return { userMessage: "Erro interno no banco de dados.", code: code || "DB_ERROR" }
  }
}

// ─── Structured error response ────────────────────────────────────────────────

/**
 * Logs the full error server-side and returns a JSON response with:
 *   { error: string, code: string, details: string }
 *
 * "error"   — safe user-facing message
 * "code"    — machine-readable code for the client
 * "details" — full technical message (for the "Ver detalhes" panel)
 */
export function dbErrorResponse(err: unknown, status = 500): Response {
  const { userMessage, code } = classifyDbError(err)
  const details = [
    err instanceof Error ? err.message : String(err),
    errMessage(err) !== (err instanceof Error ? err.message : "") ? errMessage(err) : "",
  ].filter(Boolean).join("\n")

  console.error(`[API Error] code=${code}`, err)

  return NextResponse.json({ error: userMessage, code, details }, { status })
}

/**
 * Wraps an async route handler in a try/catch that calls dbErrorResponse on failure.
 * Usage:
 *   export const GET = withErrorHandling(async (req) => { ... })
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (err) {
      return dbErrorResponse(err)
    }
  }
}
