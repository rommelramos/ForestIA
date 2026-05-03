import { redirect } from "next/navigation"
import { auth } from "../../../auth"
import { DashboardShell } from "@/components/layout/DashboardShell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role === "pending") redirect("/login?error=PendingApproval")

  return (
    <DashboardShell userRole={session.user.role} userName={session.user.name}>
      {children}
    </DashboardShell>
  )
}
