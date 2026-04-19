import { AccessRequestForm } from "@/modules/auth"

export const metadata = { title: "Solicitar Acesso — ForestIA" }

export default function RequestAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 p-4">
      <AccessRequestForm />
    </div>
  )
}
