import { Analysis, AnalysisContext, AnalysisRecord, AnalysisSource, AnalysisStatus } from "../analysis/types";

export interface AnalysisStore {
  createRecord(
    id: string,
    source: AnalysisSource,
    context: AnalysisContext,
    status: AnalysisStatus,
    userId?: string,
    projectId?: string,
    includeDifferentiators?: boolean
  ): Promise<AnalysisRecord>;
  saveAnalysis(id: string, analysis: Analysis, status?: AnalysisStatus): Promise<AnalysisRecord | undefined>;
  markFailed(id: string, error: string): Promise<AnalysisRecord | undefined>;
  getRecord(id: string): Promise<AnalysisRecord | undefined>;
}
