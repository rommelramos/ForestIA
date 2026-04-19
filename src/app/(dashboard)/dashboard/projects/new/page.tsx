import { auth } from "../../../../../../auth"
import { redirect } from "next/navigation"
import { ProjectForm } from "@/modules/projects"

export const metadata = { title: "Novo Projeto — ForestIA" }

export default async function NewProjectPage() {
  const session = await auth()
  if (!["admin", "gerente"].includes(session?.user.role ?? "")) redirect("/dashboard/projects")

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Novo Projeto</h1>
      <ProjectForm />
    </div>
  )
}
