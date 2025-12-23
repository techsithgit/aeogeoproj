export type AnalysisVersion = "v1" | "v2";

export type AnalysisSource = {
  type: "topic" | "url";
  value: string;
};

export type AnalysisContext = {
  location?: string;
  industry?: string;
};

export type PromptCluster = {
  label: string;
  signals: string[];
};

export type PromptIntelligence = {
  dominant_intent: "informational" | "navigational" | "transactional" | "ambiguous";
  intent_mismatch: string | null;
  prompt_clusters: PromptCluster[];
};

export type AEOAssessment = {
  answer_clarity_score: number; // 0-100 directional
  answer_presence: "missing" | "partial" | "clear";
  structure_issues: string[];
};

export type DiagnosisReason = {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  rank: number;
};

export type RecommendedFix = {
  id: string;
  description: string;
  why_it_matters: string;
  maps_to_reason_ids: string[];
};

export type ScoreExplanation = {
  id: string;
  message: string;
};

export type ExtractionContent = {
  title?: string;
  description?: string;
  headings?: string[];
  main_text?: string;
};

export type AnalysisExtraction = {
  status: "success" | "partial" | "failed";
  fetched_url: string;
  http_status?: number;
  content: ExtractionContent;
  warnings?: string[];
};

export type AnalysisScoring = {
  aeo_score: number;
  score_explanations: ScoreExplanation[];
};

export type Analysis = {
  id: string;
  analysis_version: AnalysisVersion;
  created_at: string;
  updated_at: string;
  source: AnalysisSource;
  context: AnalysisContext;
  extraction?: AnalysisExtraction;
  prompt_intelligence: PromptIntelligence;
  aeo: AEOAssessment;
  diagnosis: {
    blocking_reasons: DiagnosisReason[];
  };
  fixes: {
    recommended_fixes: RecommendedFix[];
  };
  scoring: AnalysisScoring;
};

export type AnalysisStatus = "queued" | "processing" | "complete" | "failed";

export type AnalysisRecord = {
  id: string;
  status: AnalysisStatus;
  created_at: string;
  updated_at: string;
  request: {
    source: AnalysisSource;
    context: AnalysisContext;
  };
  analysis?: Analysis;
  error?: string;
};
