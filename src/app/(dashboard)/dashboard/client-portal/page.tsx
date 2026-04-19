import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { projects, viabilityReports } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, FileText } from "lucide-react"

export const metadata = { title: "Portal do Cliente — ForestIA" }
export const dynamic = "force-dynamic"

export default async function ClientPortalPage() {
  const session = await auth()
  if (session?.user.role !== "cliente") redirect("/dashboard")

  const db = getDb()
  const myProjects = await db.select().from(projects).where(eq(projects.clientId, session.user.id))
  const projectIds = myProjects.map((p) => p.id)
  const reports = projectIds.length
    ? await db.select().from(viabilityReports)
        .where(eq(viabilityReports.isPublished, true))
        .orderBy(desc(viabilityReports.createdAt))
    : []

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal do Cliente</h1>
        <p className="text-sm text-gray-500">Acompanhe seus projetos e acesse relatórios publicados.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FolderKanban className="size-4" /> Meus Projetos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myProjects.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum projeto vinculado.</p>
            ) : myProjects.map((p) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.municipality && <p className="text-xs text-gray-500">{p.municipality}{p.state ? `, ${p.state}` : ""}</p>}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="size-4" /> Relatórios Publicados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum relatório publicado.</p>
            ) : reports.map((r) => (
              <Link key={r.id} href={`/dashboard/reports/${r.id}`}>
                <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500">v{r.version} · {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("pt-BR") : ""}</p>
                  </div>
                  {r.finalScore && <span className="text-sm font-bold text-green-700">{Number(r.finalScore).toFixed(1)}/10</span>}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
