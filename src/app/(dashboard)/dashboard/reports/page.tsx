import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { viabilityReports, projects } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

export const metadata = { title: "Relatórios de Viabilidade — ForestIA" }
export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-700",
  review:    "bg-yellow-100 text-yellow-800",
  approved:  "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
}
const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", review: "Em revisão", approved: "Aprovado", published: "Publicado",
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const session = await auth()
  const { project: projectId } = await searchParams
  const canCreate = ["admin", "gerente", "funcionario"].includes(session?.user.role ?? "")

  const db = getDb()
  const list = projectId
    ? await db.select().from(viabilityReports).where(eq(viabilityReports.projectId, Number(projectId))).orderBy(desc(viabilityReports.version))
    : await db.select().from(viabilityReports).orderBy(desc(viabilityReports.createdAt))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Relatórios de Viabilidade</h1>

      {list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          <FileText className="size-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum relatório gerado ainda.</p>
          <p className="text-xs mt-1">Os relatórios são criados a partir da página do projeto.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <Link key={r.id} href={`/dashboard/reports/${r.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500">
                      Projeto #{r.projectId} · v{r.version} · {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.finalScore && (
                      <span className="text-sm font-bold text-green-700">{Number(r.finalScore).toFixed(1)}/10</span>
                    )}
                    <Badge className={STATUS_STYLES[r.status] ?? ""}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
