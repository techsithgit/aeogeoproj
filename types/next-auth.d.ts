import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan?: string;
      analyses_used_this_month?: number;
      last_reset_at?: string | null;
      allow_differentiators?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    plan?: string;
    analyses_used_this_month?: number;
    last_reset_at?: string | null;
    allow_differentiators?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    plan?: string;
    analyses_used_this_month?: number;
    last_reset_at?: string | null;
    allow_differentiators?: boolean;
  }
}
