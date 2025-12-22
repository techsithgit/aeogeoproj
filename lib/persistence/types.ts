import { Analysis, AnalysisContext, AnalysisRecord, AnalysisStatus } from "../analysis/types";

export interface AnalysisStore {
  createRecord(id: string, topic: string, context: AnalysisContext, status: AnalysisStatus): Promise<AnalysisRecord>;
  saveAnalysis(id: string, analysis: Analysis, status?: AnalysisStatus): Promise<AnalysisRecord | undefined>;
  markFailed(id: string, error: string): Promise<AnalysisRecord | undefined>;
  getRecord(id: string): Promise<AnalysisRecord | undefined>;
}
