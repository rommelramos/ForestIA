import { redirect } from "next/navigation"

// Legado: redireciona para o novo portal do cliente dedicado
export default function ClientPortalRedirect() {
  redirect("/portal")
}
