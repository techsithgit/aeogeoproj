import { fileAnalysisStore } from "./fileStore";
import { kvAnalysisStore } from "./kvStore";
import { AnalysisStore } from "./types";

const provider = process.env.ANALYSIS_STORE_PROVIDER || "file";

export function getAnalysisStore(): AnalysisStore {
  if (provider === "kv") {
    return kvAnalysisStore;
  }
  return fileAnalysisStore;
}
