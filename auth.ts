import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { authConfig } from "./auth.config"
import { getDb } from "@/lib/db/drizzle"
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const db = getDb()
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1)

        if (!user || !user.passwordHash) return null
        if (!user.isActive) throw new Error("PendingApproval")

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const db = getDb()
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1)
        if (existing && !existing.allowGoogleLogin) return false
        if (existing && !existing.isActive) return "/login?error=PendingApproval"
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — persist id and role into token
        token.role = (user as { role?: string }).role ?? "pending"
        token.id   = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = (token.id   as string) ?? ""
        session.user.role = (token.role as string) ?? "pending"
      }
      return session
    },
  },
})
