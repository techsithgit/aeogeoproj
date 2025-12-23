import { kv } from "@vercel/kv";
import { Analysis, AnalysisContext, AnalysisRecord, AnalysisSource, AnalysisStatus } from "../analysis/types";
import { AnalysisStore } from "./types";

const KV_PREFIX = process.env.ANALYSIS_KV_PREFIX || "analysis";

function key(id: string) {
  return `${KV_PREFIX}:${id}`;
}

function validateKvEnv() {
  const required = ["KV_URL", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`KV is not configured. Missing env vars: ${missing.join(", ")}`);
  }
}

export class VercelKVStore implements AnalysisStore {
  async createRecord(id: string, source: AnalysisSource, context: AnalysisContext, status: AnalysisStatus): Promise<AnalysisRecord> {
    validateKvEnv();
    const now = new Date().toISOString();
    const record: AnalysisRecord = {
      id,
      status,
      created_at: now,
      updated_at: now,
      request: { source, context },
    };
    await kv.set(key(id), record);
    return record;
  }

  async saveAnalysis(id: string, analysis: Analysis, status: AnalysisStatus = "complete"): Promise<AnalysisRecord | undefined> {
    validateKvEnv();
    const existing = await this.getRecord(id);
    if (!existing) return undefined;
    const updated: AnalysisRecord = {
      ...existing,
      analysis,
      status,
      updated_at: new Date().toISOString(),
    };
    await kv.set(key(id), updated);
    return updated;
  }

  async markFailed(id: string, error: string): Promise<AnalysisRecord | undefined> {
    validateKvEnv();
    const existing = await this.getRecord(id);
    if (!existing) return undefined;
    const updated: AnalysisRecord = {
      ...existing,
      status: "failed",
      error,
      updated_at: new Date().toISOString(),
    };
    await kv.set(key(id), updated);
    return updated;
  }

  async getRecord(id: string): Promise<AnalysisRecord | undefined> {
    validateKvEnv();
    const record = await kv.get<AnalysisRecord>(key(id));
    return record ?? undefined;
  }
}

export const kvAnalysisStore = new VercelKVStore();
