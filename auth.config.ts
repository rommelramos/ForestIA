import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = auth?.user?.role ?? "pending"
      const { pathname } = nextUrl

      const PUBLIC = ["/login", "/setup", "/api/auth", "/api/db-config"]
      if (PUBLIC.some((p) => pathname.startsWith(p))) return true

      if (!isLoggedIn) return false
      if (role === "pending") return Response.redirect(new URL("/login?error=PendingApproval", nextUrl))

      const ADMIN_ONLY = ["/dashboard/admin", "/dashboard/audit-log", "/dashboard/access-requests"]
      if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "admin") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "pending"
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
