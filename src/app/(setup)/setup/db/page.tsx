import Link from "next/link"
import { DbConfigForm } from "@/modules/db-config"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = { title: "Configurar Banco — ForestIA" }

export default function DbSetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Configuração do Banco de Dados</h1>
          <p className="text-gray-500">Informe as credenciais do MySQL para conectar o ForestIA</p>
        </div>
        <DbConfigForm />
        <div className="text-center">
          <Link href="/setup" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            ← Voltar ao setup
          </Link>
        </div>
      </div>
    </div>
  )
}
