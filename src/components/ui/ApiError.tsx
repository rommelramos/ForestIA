"use client"

import { useState } from "react"

interface ApiErrorProps {
  /** User-facing summary message */
  error: string
  /** Technical details shown in the expandable panel */
  details?: string
  /** Machine-readable error code */
  code?: string
  /** Optional retry callback */
  onRetry?: () => void
  className?: string
}

/**
 * Displays a structured API / DB error with:
 * - A concise user-facing message
 * - An expandable "Ver detalhes" panel with the full technical error
 * - An optional retry button
 */
export function ApiError({ error, details, code, onRetry, className = "" }: ApiErrorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
          <p className="text-red-700 font-medium leading-snug">{error}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-2.5 py-1 rounded border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
            >
              Tentar novamente
            </button>
          )}
          {details && (
            <button
              onClick={() => setOpen(o => !o)}
              className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
            >
              {open ? "Ocultar detalhes" : "Ver detalhes"}
            </button>
          )}
        </div>
      </div>

      {open && details && (
        <div className="mt-3 rounded-lg bg-red-100 border border-red-200 overflow-hidden">
          {code && (
            <div className="px-3 py-1.5 border-b border-red-200 bg-red-200/50">
              <span className="text-xs font-mono font-semibold text-red-700">{code}</span>
            </div>
          )}
          <pre className="px-3 py-2.5 text-xs text-red-800 overflow-auto max-h-48 whitespace-pre-wrap break-words leading-relaxed">
            {details}
          </pre>
        </div>
      )}
    </div>
  )
}
