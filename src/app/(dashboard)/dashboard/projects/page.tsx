import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectMembers } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FolderKanban, MapPin, Calendar } from "lucide-react"

export const metadata = { title: "Projetos — ForestIA" }
export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado",
}

export default async function ProjectsPage() {
  const session = await auth()
  const role = session?.user.role ?? "funcionario"
  const userId = session?.user.id ?? ""
  const canCreate = ["admin", "gerente"].includes(role)

  const db = getDb()
  let list: (typeof projects.$inferSelect)[] = []

  if (["admin", "gerente"].includes(role)) {
    list = await db.select().from(projects).orderBy(projects.createdAt)
  } else if (role === "funcionario") {
    const memberOf = await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, userId))
    const ids = memberOf.map((m) => m.projectId)
    list = ids.length ? await db.select().from(projects).where(inArray(projects.id, ids)) : []
  } else {
    list = await db.select().from(projects).where(eq(projects.clientId, userId))
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
        {canCreate && (
          <Link href="/dashboard/projects/new" className={cn(buttonVariants(), "bg-green-700 hover:bg-green-800")}>
            + Novo projeto
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FolderKanban className="size-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum projeto encontrado.</p>
            {canCreate && (
              <Link href="/dashboard/projects/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
                Criar primeiro projeto
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                    <Badge className={cn("shrink-0 text-xs", STATUS_STYLES[p.status] ?? "")}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm text-gray-500">
                  {p.municipality && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0" />
                      <span>{p.municipality}{p.state ? `, ${p.state}` : ""}</span>
                    </div>
                  )}
                  {p.areaHectares && <p className="text-xs">{Number(p.areaHectares).toLocaleString("pt-BR")} ha</p>}
                  {p.expectedEndDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 shrink-0" />
                      <span>Previsão: {new Date(p.expectedEndDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  {p.sicarCode && <p className="text-xs font-mono text-gray-400">{p.sicarCode}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
