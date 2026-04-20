"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { GeospatialMapClient } from "./GeospatialMapClient"
import { OverlapsList } from "./OverlapsList"

const W         = 400   // window width px
const H_OPEN    = 320   // window height when expanded
const H_HEADER  = 40    // header bar height
const PAD       = 16    // margin from container edge

interface Pos { x: number; y: number }

interface Props {
  projectId: number
  canManage: boolean
}

export function GeoSplitLayout({ projectId, canManage }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const dragging      = useRef(false)
  const dragOffset    = useRef<Pos>({ x: 0, y: 0 })

  // Position: bottom-right corner initially (set after mount)
  const [pos,       setPos]       = useState<Pos | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [listKey,   setListKey]   = useState(0)

  // Set initial position once container is measured
  useEffect(() => {
    if (!containerRef.current) return
    const { offsetWidth: w, offsetHeight: h } = containerRef.current
    setPos({
      x: w - W - PAD,
      y: h - H_OPEN - PAD,
    })
  }, [])

  // ── Drag: move window by its header ──────────────────────────────────────
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pos) return
    dragging.current   = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const { offsetWidth: cw, offsetHeight: ch } = containerRef.current
      const winH = minimized ? H_HEADER : H_OPEN
      const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, cw - W))
      const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, ch - winH))
      setPos({ x, y })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [minimized])

  // ── Toggle minimize ───────────────────────────────────────────────────────
  const toggle = useCallback(() => setMinimized(m => !m), [])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">

      {/* Map — full area */}
      <div className="absolute inset-0">
        <GeospatialMapClient
          projectId={projectId}
          onSaved={() => setListKey(k => k + 1)}
        />
      </div>

      {/* Floating window */}
      {pos && (
        <div
          style={{
            position: "absolute",
            left:   pos.x,
            top:    pos.y,
            width:  W,
            height: minimized ? H_HEADER : H_OPEN,
            zIndex: 1000,
          }}
          className="flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden transition-[height] duration-150"
        >
          {/* Title bar — drag handle */}
          <div
            onMouseDown={onHeaderMouseDown}
            className="flex items-center justify-between px-3 bg-green-900 text-white cursor-grab active:cursor-grabbing select-none flex-shrink-0"
            style={{ height: H_HEADER }}
          >
            <div className="flex items-center gap-2">
              {/* Grip icon */}
              <div className="flex flex-col gap-[3px] opacity-50">
                <div className="flex gap-[3px]">
                  {[0,1,2,3].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-white" />)}
                </div>
                <div className="flex gap-[3px]">
                  {[0,1,2,3].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-white" />)}
                </div>
              </div>
              <span className="text-xs font-semibold tracking-wide">🗂️ Sobreposições salvas</span>
            </div>

            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={toggle}
              title={minimized ? "Expandir" : "Minimizar"}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors text-white text-sm"
            >
              {minimized ? "□" : "─"}
            </button>
          </div>

          {/* Content */}
          {!minimized && (
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
              <OverlapsList key={listKey} projectId={projectId} canManage={canManage} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
