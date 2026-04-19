import { Suspense } from "react"
import { LoginForm } from "@/modules/auth"

export const metadata = { title: "Login — ForestIA" }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 p-4">
      <div className="w-full max-w-md space-y-4">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
