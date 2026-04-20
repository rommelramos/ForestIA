"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { dbCredentialsSchema, type DbCredentialsInput } from "../schemas"
import { useDbConfig } from "../hooks/useDbConfig"
import { DbActionDialog } from "./DbActionDialog"

const DEFAULT_VALUES: DbCredentialsInput = {
  host: "69.6.249.192",
  port: 3306,
  user: "rommel34_forestia",
  password: "",
  database: "rommel34_forestia",
}

export function DbConfigForm() {
  const { status, response, testConnection, executeDbAction } = useDbConfig()
  const [dialogAction, setDialogAction] = useState<"create" | "regenerate" | null>(null)
  const [pendingCredentials, setPendingCredentials] = useState<DbCredentialsInput | null>(null)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<DbCredentialsInput>({
    resolver: zodResolver(dbCredentialsSchema),
    defaultValues: DEFAULT_VALUES,
  })

  async function onTest(data: DbCredentialsInput) {
    const result = await testConnection(data)
    if (result.success && result.databaseExists === false) {
      setPendingCredentials(data)
      setDialogAction("create")
    }
  }

  function onClickRegenerate() {
    const values = getValues()
    const parsed = dbCredentialsSchema.safeParse(values)
    if (parsed.success) {
      setPendingCredentials(parsed.data)
      setDialogAction("regenerate")
    }
  }

  async function onDialogConfirm(action: "create" | "regenerate") {
    if (!pendingCredentials) return
    await executeDbAction(action, pendingCredentials)
    setDialogAction(null)
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Configuração do Banco de Dados
            {status === "success" && <Badge className="bg-green-600 text-white">Conectado</Badge>}
            {status === "error" && <Badge variant="destructive">Erro</Badge>}
          </CardTitle>
          <CardDescription>
            Configure a conexão com o banco de dados MySQL. As credenciais são salvas como variáveis de ambiente.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onTest)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="host">Host / IP</Label>
                <Input id="host" placeholder="69.6.249.192" {...register("host")} />
                {errors.host && <p className="text-sm text-red-500">{errors.host.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="port">Porta</Label>
                <Input id="port" type="number" placeholder="3306" {...register("port")} />
                {errors.port && <p className="text-sm text-red-500">{errors.port.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="user">Usuário</Label>
                <Input id="user" placeholder="rommel34_forestia" {...register("user")} />
                {errors.user && <p className="text-sm text-red-500">{errors.user.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="database">Nome do Banco</Label>
              <Input id="database" placeholder="rommel34_forestia" {...register("database")} />
              {errors.database && <p className="text-sm text-red-500">{errors.database.message}</p>}
            </div>

            {response && !response.success && (
              <Alert variant="destructive">
                <AlertDescription>{response.error}</AlertDescription>
              </Alert>
            )}

            {response?.success && response.databaseExists && (
              <Alert>
                <AlertDescription className="text-green-700">
                  Conexão estabelecida. Banco de dados encontrado e disponível.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={status === "testing"}>
                {status === "testing" ? "Testando..." : "Testar Conexão"}
              </Button>

              {response?.success && response.databaseExists && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onClickRegenerate}
                  >
                    Regenerar Banco
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <DbActionDialog
        action={dialogAction}
        onConfirm={onDialogConfirm}
        onCancel={() => setDialogAction(null)}
      />
    </>
  )
}
