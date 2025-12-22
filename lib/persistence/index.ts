import { fileAnalysisStore } from "./fileStore";
import { kvAnalysisStore } from "./kvStore";
import { postgresAnalysisStore } from "./postgresStore";
import { AnalysisStore } from "./types";

export function getAnalysisStore(): AnalysisStore {
  const provider = (process.env.ANALYSIS_STORE_PROVIDER || "file").toLowerCase();
  if (provider === "kv") {
    return kvAnalysisStore;
  }
  if (provider === "postgres") {
    return postgresAnalysisStore;
  }
  return fileAnalysisStore;
}
