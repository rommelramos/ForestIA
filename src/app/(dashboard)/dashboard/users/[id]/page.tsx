import { auth } from "../../../../../../auth"
import { redirect, notFound } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { UserEditForm } from "@/modules/users/components/UserEditForm"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/dashboard")

  const { id } = await params
  const db = getDb()
  const [user] = await db
    .select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, isActive: users.isActive, allowGoogleLogin: users.allowGoogleLogin,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) notFound()

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 mb-4 transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Voltar para usuários
        </Link>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Administração</p>
        <h1 className="text-2xl font-bold text-zinc-900">Editar Usuário</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>
      </div>
      <UserEditForm user={user} />
    </div>
  )
}
