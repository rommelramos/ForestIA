import { auth } from "../../../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { serviceOpportunities, servicesCatalog } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AiServicesClient } from "@/modules/services/components/AiServicesClient"

export const dynamic = "force-dynamic"

const STATUS: Record<string, string> = {
  open:     "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  done:     "bg-gray-100 text-gray-600",
}

export default async function ProjectServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  const db = getDb()

  const opps = await db
    .select({ id: serviceOpportunities.id, status: serviceOpportunities.status, notes: serviceOpportunities.notes,
              detectedAt: serviceOpportunities.detectedAt, serviceName: servicesCatalog.name,
              serviceDesc: servicesCatalog.description })
    .from(serviceOpportunities)
    .leftJoin(servicesCatalog, eq(serviceOpportunities.serviceId, servicesCatalog.id))
    .where(eq(serviceOpportunities.projectId, Number(id)))

  const canManage = ["admin","gerente","funcionario"].includes(session?.user.role ?? "")
  const isAdmin   = session?.user.role === "admin"

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Novos Serviços</h2>
      </div>

      {/* AI Suggestions */}
      {canManage && <AiServicesClient projectId={Number(id)} isAdmin={isAdmin} />}

      {/* Existing opportunities */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Oportunidades identificadas ({opps.length})</h3>
        {opps.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border rounded-xl">
            <p className="text-2xl mb-1">💡</p>
            <p className="text-sm">Nenhum serviço identificado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {opps.map((o) => (
              <div key={o.id} className="bg-white border rounded-lg p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{o.serviceName ?? "Serviço sem nome"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[o.status] ?? "bg-gray-100"}`}>{o.status}</span>
                  </div>
                  {o.serviceDesc && <p className="text-xs text-gray-500 mt-0.5">{o.serviceDesc}</p>}
                  {o.notes && <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{o.notes}&rdquo;</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(o.detectedAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
