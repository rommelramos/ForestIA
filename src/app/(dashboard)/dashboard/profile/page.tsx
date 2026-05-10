import { auth } from "../../../../../auth"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/drizzle"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { ProfileForm } from "@/modules/users/components/ProfileForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Meu Perfil — ForestIA" }

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const db = getDb()
  const [user] = await db
    .select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, allowGoogleLogin: users.allowGoogleLogin,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user) redirect("/login")

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Meu Perfil</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>
      </div>
      <ProfileForm user={user} />
    </div>
  )
}
