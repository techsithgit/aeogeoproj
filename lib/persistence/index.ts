import { fileAnalysisStore } from "./fileStore";
import { kvAnalysisStore } from "./kvStore";
import { postgresAnalysisStore } from "./postgresStore";
import { AnalysisStore } from "./types";

function hasPostgresEnv() {
  return Boolean(
    process.env.POSTGRES_URL ||
      (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_DATABASE)
  );
}

function hasKvEnv() {
  return Boolean(process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function getProviderName(): "postgres" | "kv" | "file" {
  const provider = (process.env.ANALYSIS_STORE_PROVIDER || "").trim().toLowerCase();
  if (provider === "postgres") return "postgres";
  if (provider === "kv") {
    if (hasKvEnv()) return "kv";
    if (hasPostgresEnv()) return "postgres";
    return "file";
  }
  if (hasPostgresEnv()) return "postgres";
  if (hasKvEnv()) return "kv";
  return "file";
}

export function getAnalysisStore(): AnalysisStore {
  const provider = getProviderName();
  if (provider === "postgres") return postgresAnalysisStore;
  if (provider === "kv") return kvAnalysisStore;
  return fileAnalysisStore;
}
