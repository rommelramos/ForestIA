import { redirect } from "next/navigation"
import { auth } from "../../../auth"
import { Sidebar } from "@/components/layout/Sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role === "pending") redirect("/login?error=PendingApproval")

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={session.user.role} userName={session.user.name} />
      <main className="flex-1 bg-gray-50 overflow-auto min-h-0">
        {children}
      </main>
    </div>
  )
}
