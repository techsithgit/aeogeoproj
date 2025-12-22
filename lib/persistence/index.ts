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

export function getAnalysisStore(): AnalysisStore {
  const provider = (process.env.ANALYSIS_STORE_PROVIDER || "").trim().toLowerCase();
  if (provider === "postgres") {
    return postgresAnalysisStore;
  }
  if (provider === "kv") {
    if (hasKvEnv()) return kvAnalysisStore;
    if (hasPostgresEnv()) return postgresAnalysisStore;
    return fileAnalysisStore;
  }

  // Autodetect if no explicit provider set.
  if (hasPostgresEnv()) {
    return postgresAnalysisStore;
  }
  if (hasKvEnv()) {
    return kvAnalysisStore;
  }

  return fileAnalysisStore;
}
