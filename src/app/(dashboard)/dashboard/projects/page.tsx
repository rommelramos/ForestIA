import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FolderKanban, MapPin, Calendar, Plus, Ruler } from "lucide-react"

export const metadata = { title: "Projetos — ForestIA" }
export const dynamic = "force-dynamic"

const STATUS_BAR: Record<string, string> = {
  active:    "bg-emerald-500",
  paused:    "bg-amber-400",
  completed: "bg-blue-500",
  cancelled: "bg-zinc-400",
}

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused:    "bg-amber-50  text-amber-700  border-amber-200",
  completed: "bg-blue-50   text-blue-700   border-blue-200",
  cancelled: "bg-zinc-100  text-zinc-500   border-zinc-200",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado",
}

export default async function ProjectsPage() {
  const session  = await auth()
  const role     = session?.user.role ?? "funcionario"
  const userId   = session?.user.id   ?? ""
  const canCreate = ["admin","gerente"].includes(role)

  const db = getDb()
  let list: (typeof projects.$inferSelect)[] = []

  if (["admin","gerente"].includes(role)) {
    list = await db.select().from(projects).orderBy(projects.createdAt)
  } else if (role === "funcionario") {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
    const ids = memberOf.map((m) => m.projectId)
    list = ids.length ? await db.select().from(projects).where(inArray(projects.id, ids)) : []
  } else {
    list = await db.select().from(projects).where(eq(projects.clientId, userId))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">
            Gestão
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">Projetos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {list.length} projeto{list.length !== 1 ? "s" : ""} encontrado{list.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/projects/new"
            className={cn(buttonVariants(), "bg-emerald-600 hover:bg-emerald-700 shadow-sm gap-1.5")}
          >
            <Plus className="size-4" />
            Novo projeto
          </Link>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────────── */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <div className="size-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <FolderKanban className="size-7 text-zinc-400" />
          </div>
          <p className="font-semibold text-zinc-700 text-sm">Nenhum projeto encontrado</p>
          <p className="text-xs text-zinc-400 mt-1 mb-5">Crie o primeiro projeto para começar</p>
          {canCreate && (
            <Link
              href="/dashboard/projects/new"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <Plus className="size-4" />
              Criar primeiro projeto
            </Link>
          )}
        </div>
      ) : (
        /* ── Project grid ─────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="group block">
              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300">

                {/* Status accent bar */}
                <div className={cn("h-1", STATUS_BAR[p.status] ?? "bg-zinc-300")} />

                <div className="p-5 space-y-3">
                  {/* Title + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 leading-snug text-sm group-hover:text-emerald-700 transition-colors">
                      {p.name}
                    </h3>
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0",
                      STATUS_BADGE[p.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                    )}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5 text-xs text-zinc-500">
                    {p.municipality && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-zinc-400" />
                        <span>{p.municipality}{p.state ? `, ${p.state}` : ""}</span>
                      </div>
                    )}
                    {p.areaHectares && (
                      <div className="flex items-center gap-1.5">
                        <Ruler className="size-3.5 shrink-0 text-zinc-400" />
                        <span>{Number(p.areaHectares).toLocaleString("pt-BR")} ha</span>
                      </div>
                    )}
                    {p.expectedEndDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 shrink-0 text-zinc-400" />
                        <span>Previsão: {new Date(p.expectedEndDate).toLocaleDateString("pt-BR")}</span>
                      </div>
                    )}
                    {p.sicarCode && (
                      <p className="font-mono text-[11px] text-zinc-400 bg-zinc-50 rounded px-1.5 py-0.5 inline-block">
                        {p.sicarCode}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
