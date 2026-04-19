import { auth } from "../../../../../auth"
import { getDb } from "@/lib/db/drizzle"
import { geospatialSources } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SeedSourcesButton } from "@/modules/geospatial-sources/components/SeedSourcesButton"
import { Star, ExternalLink } from "lucide-react"

export const metadata = { title: "Bases Geoespaciais — ForestIA" }
export const dynamic = "force-dynamic"

const TYPE_STYLES: Record<string, string> = {
  vetorial: "bg-blue-100 text-blue-800", raster: "bg-purple-100 text-purple-800",
  tabular: "bg-gray-100 text-gray-700", api: "bg-green-100 text-green-800",
}
const CATEGORY_LABELS: Record<string, string> = {
  vegetacao: "Vegetação", uso_solo: "Uso do Solo", hidrografia: "Hidrografia",
  areas_protegidas: "Áreas Protegidas", fundiario: "Fundiário",
  infraestrutura: "Infraestrutura", limites_administrativos: "Limites Adm.",
}

export default async function GeospatialSourcesPage() {
  const session = await auth()
  const canManage = ["admin", "gerente"].includes(session?.user.role ?? "")
  const db = getDb()
  const list = await db.select().from(geospatialSources).where(eq(geospatialSources.isActive, true)).orderBy(geospatialSources.name)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Bases Geoespaciais</h1>
          <p className="text-sm text-gray-500">{list.length} fontes cadastradas</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {list.length === 0 && <SeedSourcesButton />}
            <Link href="/dashboard/geospatial-sources/new" className={cn(buttonVariants(), "bg-green-700 hover:bg-green-800")}>+ Nova fonte</Link>
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500 space-y-3">
          <p>Nenhuma fonte cadastrada.</p>
          {canManage && <SeedSourcesButton variant="prominent" />}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((src) => (
            <Card key={src.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-tight">{src.name}</CardTitle>
                  <Badge className={cn("shrink-0 text-xs", TYPE_STYLES[src.dataType] ?? "")}>{src.dataType}</Badge>
                </div>
                <p className="text-xs text-gray-500">{src.organization}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {src.thematicCategory && <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[src.thematicCategory] ?? src.thematicCategory}</Badge>}
                {src.description && <p className="text-xs text-gray-600 line-clamp-2">{src.description}</p>}
                {src.applicability && <p className="text-xs text-green-700 line-clamp-2"><strong>Uso:</strong> {src.applicability}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("size-3", i < (src.reliabilityLevel ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200")} />
                    ))}
                  </div>
                  {src.accessUrl && (
                    <a href={src.accessUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 hover:underline flex items-center gap-1">
                      Acessar <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
