import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isDbConfigured } from "@/lib/env"

export default function Home() {
  const dbConfigured = isDbConfigured()

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-800">
      <main className="flex flex-col items-center gap-8 text-center px-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-white tracking-tight">ForestIA</h1>
          <p className="text-xl text-green-200">Gestão Florestal Inteligente</p>
        </div>

        <p className="max-w-md text-green-300 leading-relaxed">
          Plataforma integrada para monitoramento geoespacial, inventário florestal
          e geração de relatórios de viabilidade com inteligência artificial.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {!dbConfigured ? (
            <Link href="/setup" className={cn(buttonVariants({ size: "lg" }), "bg-white text-green-900 hover:bg-green-50")}>
              Configurar sistema
            </Link>
          ) : (
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "bg-white text-green-900 hover:bg-green-50")}>
              Acessar dashboard
            </Link>
          )}
          <Link href="/setup/db" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-green-400 text-green-200 hover:bg-green-800")}>
            Configurar banco
          </Link>
        </div>

        {!dbConfigured && (
          <p className="text-sm text-yellow-300">
            O banco de dados ainda não está configurado. Configure-o para continuar.
          </p>
        )}
      </main>
    </div>
  )
}
