"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { GeospatialMapClient } from "./GeospatialMapClient"
import { OverlapsList } from "./OverlapsList"

const PANEL_MIN   = 48   // px — collapsed header only
const PANEL_OPEN  = 260  // px — default open height

interface Props {
  projectId: number
  canManage: boolean
}

export function GeoSplitLayout({ projectId, canManage }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const isDragging      = useRef(false)
  const startY          = useRef(0)
  const startHeight     = useRef(0)

  const [panelH,     setPanelH]     = useState(PANEL_OPEN)
  const [collapsed,  setCollapsed]  = useState(false)
  // key to force OverlapsList re-fetch after saving
  const [listKey,    setListKey]    = useState(0)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current  = true
    startY.current      = e.clientY
    startHeight.current = panelH
    e.preventDefault()
  }, [panelH])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const totalH  = containerRef.current.offsetHeight
      const delta   = startY.current - e.clientY
      const next    = Math.max(PANEL_MIN, Math.min(startHeight.current + delta, totalH - 120))
      setPanelH(next)
      if (next > PANEL_MIN + 10) setCollapsed(false)
    }
    const onUp = () => { isDragging.current = false }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }
  }, [])

  // ── Collapse / expand ─────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setCollapsed(c => {
      if (c) setPanelH(PANEL_OPEN)   // restore when expanding
      return !c
    })
  }, [])

  const effectiveH = collapsed ? PANEL_MIN : panelH

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none">

      {/* ── Map — fills remaining space ── */}
      <div className="flex-1 min-h-0">
        {/* Pass a callback so the map can trigger a list refresh */}
        <GeospatialMapClient
          projectId={projectId}
          onSaved={() => setListKey(k => k + 1)}
        />
      </div>

      {/* ── Bottom panel ── */}
      <div
        style={{ height: effectiveH }}
        className="flex-shrink-0 flex flex-col border-t bg-gray-50 overflow-hidden transition-[height] duration-150"
      >
        {/* Drag handle + header */}
        <div
          onMouseDown={onMouseDown}
          className="flex items-center justify-between px-4 border-b bg-white cursor-row-resize flex-shrink-0"
          style={{ height: PANEL_MIN }}
        >
          {/* Drag grip dots */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-[3px] opacity-40">
              <div className="flex gap-[3px]">
                {[0,1,2,3,4].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-500" />)}
              </div>
              <div className="flex gap-[3px]">
                {[0,1,2,3,4].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-500" />)}
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-700 select-none">
              🗂️ Sobreposições salvas
            </span>
          </div>

          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={toggle}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors select-none"
          >
            {collapsed ? "▲ Expandir" : "▼ Recolher"}
          </button>
        </div>

        {/* List — only visible when panel is open */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            <OverlapsList key={listKey} projectId={projectId} canManage={canManage} />
          </div>
        )}
      </div>
    </div>
  )
}
