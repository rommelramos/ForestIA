import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = { title: "Setup — ForestIA" }

const STEPS = [
  {
    step: 1,
    title: "Banco de Dados",
    description: "Configure a conexão com o MySQL do Hostgator",
    href: "/setup/db",
    cta: "Configurar",
  },
  {
    step: 2,
    title: "Conta Administrador",
    description: "Crie o usuário administrador do sistema",
    href: "/setup/admin",
    cta: "Criar conta",
  },
]

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao ForestIA</h1>
          <p className="text-gray-500">Configure o sistema em poucos passos</p>
        </div>

        <div className="space-y-4">
          {STEPS.map((s) => (
            <Card key={s.step}>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 font-bold text-sm">
                  {s.step}
                </span>
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={s.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  {s.cta}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
