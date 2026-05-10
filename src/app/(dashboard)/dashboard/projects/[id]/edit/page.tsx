import { auth } from "../../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { ProjectForm } from "@/modules/projects"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["admin", "gerente"].includes(session.user.role)) redirect("/dashboard")

  const { id } = await params
  const db = getDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, Number(id)))
    .limit(1)

  if (!project) notFound()

  const toDateStr = (d: Date | string | null | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : undefined

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 mb-4 transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Voltar para o projeto
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Projeto</h1>
      </div>
      <ProjectForm
        projectId={project.id}
        defaultValues={{
          name:            project.name,
          description:     project.description     ?? undefined,
          clientId:        project.clientId        ?? undefined,
          managerId:       project.managerId       ?? undefined,
          sicarCode:       project.sicarCode       ?? undefined,
          municipality:    project.municipality    ?? undefined,
          state:           project.state           ?? undefined,
          areaHectares:    project.areaHectares    ? Number(project.areaHectares) : undefined,
          startDate:       toDateStr(project.startDate),
          expectedEndDate: toDateStr(project.expectedEndDate),
        }}
      />
    </div>
  )
}
