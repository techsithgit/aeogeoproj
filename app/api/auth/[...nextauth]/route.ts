import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { PLAN_LIMITS } from "@/lib/auth/plans";

async function ensureUser(email: string) {
  const lowerEmail = email.toLowerCase();
  const existing = await sql`SELECT id, plan, analyses_used_this_month, last_reset_at FROM users WHERE email = ${lowerEmail} LIMIT 1;`;
  if (existing.rows.length) {
    return existing.rows[0];
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO users (id, email, password_hash, plan, analyses_used_this_month, last_reset_at)
    VALUES (${id}, ${lowerEmail}, '', 'free', 0, ${now})
    ON CONFLICT (email) DO NOTHING;
  `;
  const created = await sql`SELECT id, plan, analyses_used_this_month, last_reset_at FROM users WHERE email = ${lowerEmail} LIMIT 1;`;
  return created.rows[0];
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await ensureUser(user.email);
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const lowerEmail = token.email.toLowerCase();
        const { rows } = await sql`
          SELECT id, plan, analyses_used_this_month, last_reset_at
          FROM users
          WHERE email = ${lowerEmail}
          LIMIT 1;
        `;
        if (rows.length) {
          token.userId = rows[0].id;
          token.plan = rows[0].plan;
          token.analyses_used_this_month = rows[0].analyses_used_this_month;
          token.last_reset_at = rows[0].last_reset_at;
          token.allow_differentiators = PLAN_LIMITS[rows[0].plan as keyof typeof PLAN_LIMITS].allow_differentiators;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.plan = token.plan as string;
        session.user.analyses_used_this_month = token.analyses_used_this_month as number;
        session.user.last_reset_at = token.last_reset_at as string | null;
        session.user.allow_differentiators = token.allow_differentiators as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
