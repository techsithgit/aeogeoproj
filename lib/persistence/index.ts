import { fileAnalysisStore } from "./fileStore";
import { kvAnalysisStore } from "./kvStore";
import { postgresAnalysisStore } from "./postgresStore";
import { AnalysisStore } from "./types";

const provider = process.env.ANALYSIS_STORE_PROVIDER || "file";

export function getAnalysisStore(): AnalysisStore {
  if (provider === "kv") {
    return kvAnalysisStore;
  }
  if (provider === "postgres") {
    return postgresAnalysisStore;
  }
  return fileAnalysisStore;
}
