import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, projectStages, projectMembers, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StageBoard } from "@/modules/projects"
import { cn } from "@/lib/utils"
import { MapPin, Calendar, Layers, Users } from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800", paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800", cancelled: "bg-red-100 text-red-800",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado",
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const db = getDb()

  const [project] = await db.select().from(projects).where(eq(projects.id, Number(id))).limit(1)
  if (!project) notFound()

  const stages = await db.select().from(projectStages)
    .where(eq(projectStages.projectId, Number(id))).orderBy(projectStages.order)

  const members = await db
    .select({ id: projectMembers.id, role: projectMembers.role, name: users.name, email: users.email })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, Number(id)))

  const canEdit = ["admin", "gerente"].includes(session.user.role)
  const canManageStages = ["admin", "gerente", "funcionario"].includes(session.user.role)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge className={cn("text-xs", STATUS_STYLES[project.status] ?? "")}>
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>
          {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
        </div>
        {canEdit && (
          <Link href={`/dashboard/projects/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Editar
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {project.municipality && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="size-4 text-green-600" />
            <span>{project.municipality}{project.state ? `, ${project.state}` : ""}</span>
          </div>
        )}
        {project.areaHectares && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers className="size-4 text-green-600" />
            <span>{Number(project.areaHectares).toLocaleString("pt-BR")} ha</span>
          </div>
        )}
        {project.expectedEndDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="size-4 text-green-600" />
            <span>Previsão: {new Date(project.expectedEndDate).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
        {project.sicarCode && (
          <div className="text-sm font-mono text-gray-500">SICAR: {project.sicarCode}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Etapas do projeto</h2>
            {canManageStages && (
              <Link href={`/dashboard/projects/${id}/stages`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Gerenciar etapas
              </Link>
            )}
          </div>
          <StageBoard projectId={Number(id)} stages={stages} canEdit={canManageStages} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4" /> Equipe ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.length === 0
                ? <p className="text-sm text-gray-400">Sem membros.</p>
                : members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.name ?? m.email}</span>
                    <Badge variant="outline" className="text-xs">{m.role}</Badge>
                  </div>
                ))
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Análises</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link href={`/dashboard/aoi-analysis?project=${id}`} className="flex items-center gap-2 text-green-700 hover:underline">
                → Análise Geoespacial
              </Link>
              <Link href={`/dashboard/satellite?project=${id}`} className="flex items-center gap-2 text-green-700 hover:underline">
                → Análise por Satélite
              </Link>
              <Link href={`/dashboard/reports?project=${id}`} className="flex items-center gap-2 text-green-700 hover:underline">
                → Relatórios de Viabilidade
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
