"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DbActionDialogProps {
  action: "create" | "regenerate" | null
  onConfirm: (action: "create" | "regenerate") => void
  onCancel: () => void
}

const MESSAGES = {
  create: {
    title: "Banco de dados não encontrado",
    description: "O banco de dados configurado não existe. Deseja criá-lo agora?",
    confirmLabel: "Criar banco",
    isDestructive: false,
  },
  regenerate: {
    title: "Regenerar banco de dados",
    description: "Tem certeza que deseja regenerar o banco? Esta ação irá apagar TODOS os dados existentes.",
    confirmLabel: "Sim, apagar e recriar",
    isDestructive: true,
  },
}

export function DbActionDialog({ action, onConfirm, onCancel }: DbActionDialogProps) {
  if (!action) return null

  const msg = MESSAGES[action]

  return (
    <Dialog open={!!action} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{msg.title}</DialogTitle>
          <DialogDescription>{msg.description}</DialogDescription>
        </DialogHeader>

        {msg.isDestructive && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Atenção:</strong> Todos os registros serão permanentemente excluídos e não poderão ser recuperados.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            variant={msg.isDestructive ? "destructive" : "default"}
            onClick={() => onConfirm(action)}
          >
            {msg.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
