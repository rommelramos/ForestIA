"use client"

import { useState } from "react"
import { Send, Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"

interface Message {
  id: number
  body: string
  kind: string
  parentId: number | null
  createdAt: string
  authorId: string
  authorName: string
  isReadByClient: boolean
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function MessageBubble({ msg, currentUserId }: { msg: Message; currentUserId: string }) {
  const isMe = msg.authorId === currentUserId
  const date = new Date(msg.createdAt).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  })

  return (
    <div className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className="size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{
          background: isMe ? "oklch(0.45 0.13 155 / 20%)" : "oklch(0.17 0.05 155 / 10%)",
          color: isMe ? "oklch(0.38 0.12 155)" : "oklch(0.35 0.04 155)",
        }}
      >
        {initials(msg.authorName)}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "oklch(0.50 0.05 155)" }}>
            {isMe ? "Você" : msg.authorName}
          </span>
          <span className="text-[10px]" style={{ color: "oklch(0.65 0.03 155)" }}>{date}</span>
        </div>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={isMe ? {
            background: "oklch(0.45 0.13 155)",
            color: "white",
            borderBottomRightRadius: "4px",
          } : {
            background: "oklch(0.97 0.005 155)",
            color: "oklch(0.16 0.015 155)",
            border: "1px solid oklch(0.88 0.015 155)",
            borderBottomLeftRadius: "4px",
          }}
        >
          {msg.body}
        </div>
      </div>
    </div>
  )
}

export function MessageThreadView({
  projectId,
  currentUserId,
  messages: initialMessages,
}: {
  projectId: number
  currentUserId: string
  messages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setLoading(true)

    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, body: body.trim(), kind: "question" }),
      })
      if (!res.ok) throw new Error("Falha ao enviar mensagem")
      const newMsg = await res.json() as Message
      setMessages(prev => [...prev, newMsg])
      setBody("")
      toast.success("Mensagem enviada")
    } catch {
      toast.error("Erro ao enviar mensagem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
         style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.015 155 / 60%)", minHeight: "400px" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-2 border-b"
           style={{ borderColor: "oklch(0.90 0.015 155 / 60%)" }}>
        <MessageCircle className="size-4" style={{ color: "oklch(0.48 0.10 155)" }} />
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "oklch(0.48 0.06 155)" }}>
          Mensagens
        </h2>
        <span className="text-xs ml-auto" style={{ color: "oklch(0.60 0.04 155)" }}>
          {messages.length} mensagem{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4"
           style={{ background: "oklch(0.985 0.006 80)", minHeight: "260px", maxHeight: "480px" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <MessageCircle className="size-8" style={{ color: "oklch(0.75 0.04 155)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "oklch(0.42 0.05 155)" }}>
                Nenhuma mensagem ainda
              </p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.60 0.03 155)" }}>
                Envie uma pergunta ou comentário para a equipe técnica.
              </p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} />
          ))
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend}
            className="px-4 py-3 flex items-end gap-3 border-t"
            style={{ borderColor: "oklch(0.90 0.015 155 / 60%)" }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e) }
          }}
          placeholder="Escreva sua mensagem... (Enter para enviar)"
          rows={2}
          className="flex-1 resize-none text-sm outline-none rounded-xl px-3.5 py-2.5"
          style={{
            background: "oklch(0.97 0.005 155)",
            border: "1px solid oklch(0.84 0.020 155)",
            color: "oklch(0.16 0.015 155)",
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || loading}
          className="size-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
          style={{ background: "oklch(0.45 0.13 155)", color: "white" }}
        >
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : <Send className="size-4" />
          }
        </button>
      </form>
    </div>
  )
}
