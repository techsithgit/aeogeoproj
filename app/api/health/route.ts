import { NextResponse } from "next/server";
import { getProviderName } from "@/lib/persistence";

export async function GET() {
  const provider = getProviderName();
  return NextResponse.json({
    status: "ok",
    provider,
    env: {
      postgres_env: Boolean(
        process.env.POSTGRES_URL ||
          (process.env.POSTGRES_HOST &&
            process.env.POSTGRES_USER &&
            process.env.POSTGRES_PASSWORD &&
            process.env.POSTGRES_DATABASE)
      ),
      kv_env: Boolean(process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    },
  });
}
