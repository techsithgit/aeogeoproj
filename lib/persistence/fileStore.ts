import fs from "fs";
import path from "path";
import { Analysis, AnalysisContext, AnalysisRecord, AnalysisSource, AnalysisStatus } from "../analysis/types";
import { AnalysisStore } from "./types";

const primaryStorePath =
  process.env.ANALYSIS_STORE_PATH ||
  path.resolve(process.cwd(), ".next", "analysis-store.json");

const fallbackPaths = [
  primaryStorePath,
  path.resolve(process.cwd(), "analysis-store.json"),
  "/tmp/analysis-store.json",
];

type StoreState = {
  memory: Map<string, AnalysisRecord>;
};

const globalStore: StoreState =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__analysisHybridStore ??
  {
    memory: new Map<string, AnalysisRecord>(),
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__analysisHybridStore = globalStore;

function ensureStoreDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadAllStores(): Record<string, AnalysisRecord> {
  const merged: Record<string, AnalysisRecord> = {};
  for (const candidate of fallbackPaths) {
    try {
      const contents = fs.readFileSync(candidate, "utf-8");
      const parsed = JSON.parse(contents) as Record<string, AnalysisRecord>;
      Object.assign(merged, parsed);
    } catch {
      // ignore missing/invalid files
    }
  }
  return merged;
}

function persistStore(data: Record<string, AnalysisRecord>) {
  ensureStoreDir(primaryStorePath);
  fs.writeFileSync(primaryStorePath, JSON.stringify(data, null, 2), "utf-8");
}

function syncMemoryFromDisk() {
  const data = loadAllStores();
  Object.entries(data).forEach(([id, record]) => {
    globalStore.memory.set(id, record);
  });
}

syncMemoryFromDisk();

export class FileAnalysisStore implements AnalysisStore {
  async createRecord(
    id: string,
    source: AnalysisSource,
    context: AnalysisContext,
    status: AnalysisStatus,
    _userId?: string,
    projectId?: string,
    includeDifferentiators?: boolean
  ): Promise<AnalysisRecord> {
    const now = new Date().toISOString();
    const record: AnalysisRecord = {
      id,
      status,
      created_at: now,
      updated_at: now,
      request: {
        source,
        context,
        include_differentiators: includeDifferentiators,
        project_id: projectId,
      },
    };
    globalStore.memory.set(id, record);
    const merged = { ...loadAllStores(), [id]: record };
    persistStore(merged);
    return record;
  }

  async saveAnalysis(id: string, analysis: Analysis, status: AnalysisStatus = "complete"): Promise<AnalysisRecord | undefined> {
    const existing = await this.getRecord(id);
    if (!existing) return undefined;
    const updated: AnalysisRecord = {
      ...existing,
      analysis,
      status,
      updated_at: new Date().toISOString(),
    };
    globalStore.memory.set(id, updated);
    const merged = { ...loadAllStores(), [id]: updated };
    persistStore(merged);
    return updated;
  }

  async markFailed(id: string, error: string): Promise<AnalysisRecord | undefined> {
    const existing = await this.getRecord(id);
    if (!existing) return undefined;
    const updated: AnalysisRecord = {
      ...existing,
      status: "failed",
      error,
      updated_at: new Date().toISOString(),
    };
    globalStore.memory.set(id, updated);
    const merged = { ...loadAllStores(), [id]: updated };
    persistStore(merged);
    return updated;
  }

  async getRecord(id: string): Promise<AnalysisRecord | undefined> {
    const fromMemory = globalStore.memory.get(id);
    if (fromMemory) return fromMemory;
    const all = loadAllStores();
    const fromDisk = all[id];
    if (fromDisk) {
      globalStore.memory.set(id, fromDisk);
    }
    return fromDisk;
  }
}

export const fileAnalysisStore = new FileAnalysisStore();
