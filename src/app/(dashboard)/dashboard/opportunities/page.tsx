import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { serviceOpportunities, servicesCatalog, projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb } from "lucide-react"

export const metadata = { title: "Novos Serviços — ForestIA" }
export const dynamic = "force-dynamic"

export default async function OpportunitiesPage() {
  const session = await auth()
  if (!["admin", "gerente"].includes(session?.user.role ?? "")) redirect("/dashboard")

  const db = getDb()
  const opportunities = await db
    .select({ id: serviceOpportunities.id, status: serviceOpportunities.status, detectedAt: serviceOpportunities.detectedAt,
      notes: serviceOpportunities.notes, projectId: serviceOpportunities.projectId, serviceName: servicesCatalog.name })
    .from(serviceOpportunities)
    .leftJoin(servicesCatalog, eq(serviceOpportunities.serviceId, servicesCatalog.id))
    .orderBy(serviceOpportunities.detectedAt)

  const catalog = await db.select().from(servicesCatalog).where(eq(servicesCatalog.isActive, true))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inteligência de Novos Serviços</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="size-4 text-yellow-500" /> Oportunidades Identificadas</CardTitle></CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma oportunidade identificada ainda. Elas são geradas automaticamente durante as análises.</p>
              ) : opportunities.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{o.serviceName ?? "Serviço"}</p>
                    <p className="text-xs text-gray-500">Projeto #{o.projectId} · {new Date(o.detectedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant="outline">{o.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Catálogo de Serviços</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {catalog.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum serviço no catálogo.</p>
            ) : catalog.map((s) => (
              <div key={s.id} className="p-2 border rounded text-xs">
                <p className="font-medium">{s.name}</p>
                {s.triggerCondition && <p className="text-gray-500 mt-0.5">{s.triggerCondition}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
