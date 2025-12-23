import crypto from "crypto";
import {
  Analysis,
  AnalysisContext,
  AnalysisExtraction,
  AnalysisScoring,
  AnalysisSource,
  AnalysisVersion,
  DiagnosisReason,
  PromptCluster,
  RecommendedFix,
} from "./types";

const ANALYSIS_VERSION: AnalysisVersion = "v2";

type TopicSignals = {
  normalized: string;
  lower: string;
  words: string[];
  hasQuestionWord: boolean;
  hasQuestionMark: boolean;
  hasComparison: boolean;
  hasBestSuperlative: boolean;
  hasTransactionalCue: boolean;
  hasGeoCue: boolean;
};

const questionWords = ["who", "what", "when", "where", "why", "how"];
const comparisonWords = ["vs", "versus", "compare", "comparison", "against"];
const superlatives = ["best", "top", "leading", "most"];
const transactionalWords = ["buy", "price", "pricing", "cost", "deal", "order", "book"];
const geoWords = ["near me", "in ", "at ", "around", "closest", "local"];

function extractSignals(topic: string): TopicSignals {
  const normalized = topic.trim();
  const lower = normalized.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const hasQuestionWord = words.some((w) => questionWords.includes(w.toLowerCase()));
  const hasQuestionMark = normalized.includes("?");
  const hasComparison = comparisonWords.some((w) => lower.includes(w));
  const hasBestSuperlative = superlatives.some((w) => lower.includes(w));
  const hasTransactionalCue = transactionalWords.some((w) => lower.includes(w));
  const hasGeoCue = geoWords.some((w) => lower.includes(w));

  return {
    normalized,
    lower,
    words,
    hasQuestionWord,
    hasQuestionMark,
    hasComparison,
    hasBestSuperlative,
    hasTransactionalCue,
    hasGeoCue,
  };
}

function deriveIntent(signals: TopicSignals): "informational" | "navigational" | "transactional" | "ambiguous" {
  if (signals.hasTransactionalCue) {
    return "transactional";
  }
  if (signals.hasGeoCue) {
    return signals.hasQuestionWord ? "navigational" : "navigational";
  }
  if (signals.hasQuestionWord || signals.hasComparison || signals.hasBestSuperlative) {
    return "informational";
  }
  return "ambiguous";
}

function buildPromptClusters(signals: TopicSignals, context: AnalysisContext): PromptCluster[] {
  const clusters: PromptCluster[] = [];

  clusters.push({
    label: "specificity",
    signals: [
      signals.words.length >= 4 ? "has multi-word intent" : "ultra-short topic",
      signals.hasComparison ? "comparison cue" : "no comparison cue",
      signals.hasBestSuperlative ? "seeks ranked guidance" : "no ranking cue",
    ],
  });

  clusters.push({
    label: "context",
    signals: [
      context.location ? `location: ${context.location}` : "location missing",
      context.industry ? `industry: ${context.industry}` : "industry missing",
      signals.hasGeoCue ? "geo phrasing in topic" : "no geo phrasing in topic",
    ],
  });

  clusters.push({
    label: "actionability",
    signals: [
      signals.hasTransactionalCue ? "action/transaction cue" : "no action cue",
      signals.hasQuestionMark || signals.hasQuestionWord ? "explicit ask" : "implicit ask",
    ],
  });

  return clusters;
}

function scoreClarity(signals: TopicSignals, contentSignals: ContentSignals): number {
  let score = 78;
  if (signals.words.length < 3) score -= 25;
  if (signals.words.length >= 6 && signals.words.length <= 12) score += 8;
  if (!signals.hasQuestionMark && !signals.hasQuestionWord) score -= 12;
  if (signals.hasComparison || signals.hasBestSuperlative) score += 6;
  if (signals.hasTransactionalCue) score += 6;
  if (signals.hasGeoCue && signals.words.length < 4) score -= 4;
  if (contentSignals.mainTextLength > 0 && contentSignals.mainTextLength < 200) score -= 8;

  return Math.min(100, Math.max(0, score));
}

function deriveAnswerPresence(signals: TopicSignals): "missing" | "partial" | "clear" {
  if (signals.hasQuestionWord || signals.hasQuestionMark) return "clear";
  if (signals.hasTransactionalCue || signals.hasComparison || signals.hasBestSuperlative) return "partial";
  if (signals.hasGeoCue) return "partial";
  return "missing";
}

function gatherStructureIssues(
  signals: TopicSignals,
  context: AnalysisContext,
  contentSignals: ContentSignals,
  extraction?: AnalysisExtraction
): string[] {
  const issues: string[] = [];
  if (!signals.hasQuestionWord && !signals.hasQuestionMark) {
    issues.push("Topic is not framed as a direct ask, so the AI must infer the question.");
  }
  if (signals.words.length < 4) {
    issues.push("Topic is very short, which weakens clarity of the expected answer.");
  }
  if (signals.hasComparison && !signals.hasBestSuperlative) {
    issues.push("Comparison prompt lacks criteria for how to decide a winner.");
  }
  if (!context.location && signals.hasGeoCue) {
    issues.push("Geo phrasing is present without an explicit location to anchor the answer.");
  }
  if (!context.industry && !signals.hasTransactionalCue) {
    issues.push("No industry or domain anchor is provided.");
  }
  if (extraction) {
    if (contentSignals.mainTextLength === 0) {
      issues.push("Extracted page content is empty, so answers may be speculative.");
    } else if (contentSignals.mainTextLength < 200) {
      issues.push("Extracted page content is very short, reducing answer confidence.");
    }
    if (contentSignals.headingsCount === 0) {
      issues.push("Page lacks clear headings (H1–H3), weakening structure for answers.");
    }
    if (contentSignals.hasPaywallSignals) {
      issues.push("Page may be paywalled, limiting visible content for analysis.");
    }
  }
  return issues;
}

function buildReasons(
  signals: TopicSignals,
  context: AnalysisContext,
  contentSignals: ContentSignals,
  extraction?: AnalysisExtraction
): DiagnosisReason[] {
  const reasons: DiagnosisReason[] = [];
  const intent = deriveIntent(signals);

  reasons.push({
    id: "reason_1",
    title: "Ambiguous intent",
    detail:
      intent === "ambiguous"
        ? "The topic does not declare whether the expected answer is informational, navigational, or transactional."
        : "The topic leaves room for multiple interpretations, so an AI answer may not match the user's real goal.",
    severity: intent === "ambiguous" ? "high" : "medium",
    rank: 1,
  });

  reasons.push({
    id: "reason_2",
    title: "Missing context",
    detail:
      context.location || context.industry
        ? "Context is partial; AI still lacks clear guardrails to ground the answer."
        : "No location or industry anchor is provided, so the answer will stay generic and less trustworthy.",
    severity: context.location || context.industry ? "medium" : "high",
    rank: 2,
  });

  reasons.push({
    id: "reason_3",
    title: "Unstated answer format",
    detail:
      signals.hasQuestionWord || signals.hasQuestionMark
        ? "The question is asked, but the expected format (checklist, steps, ranked list) is not specified."
        : "The topic is not phrased as a question, so the AI must guess the answer shape.",
    severity: signals.hasQuestionWord || signals.hasQuestionMark ? "medium" : "high",
    rank: 3,
  });

  if (!signals.hasTransactionalCue && !signals.hasBestSuperlative) {
    reasons.push({
      id: "reason_4",
      title: "Weak authority signals",
      detail: "There are no qualifiers (e.g., timeframe, data points, audience) that would signal reliability.",
      severity: "low",
      rank: 4,
    });
  }

  if (extraction) {
    if (contentSignals.mainTextLength < 200) {
      reasons.push({
        id: "reason_5",
        title: "Thin on-page content",
        detail: "Extracted content is short or incomplete, so AI cannot ground the answer well.",
        severity: contentSignals.mainTextLength === 0 ? "high" : "medium",
        rank: reasons.length + 1,
      });
    }
    if (contentSignals.headingsCount === 0) {
      reasons.push({
        id: "reason_6",
        title: "Missing headings",
        detail: "The page lacks clear headings (H1–H3), so structure and intent are unclear.",
        severity: "medium",
        rank: reasons.length + 1,
      });
    }
  }

  return reasons.slice(0, 5);
}

function buildFixes(reasons: DiagnosisReason[]): RecommendedFix[] {
  const fixes: RecommendedFix[] = [];

  const reasonIds = new Set(reasons.map((r) => r.id));

  if (reasonIds.has("reason_1")) {
    fixes.push({
      id: "fix_1",
      description: "Rewrite the topic to name the exact action or decision you want (e.g., 'How to choose X for Y outcome').",
      why_it_matters: "Explicit intent lets the AI choose a fitting reasoning path instead of guessing.",
      maps_to_reason_ids: ["reason_1"],
    });
  }

  if (reasonIds.has("reason_2")) {
    fixes.push({
      id: "fix_2",
      description: "Add location or industry qualifiers so the answer uses relevant constraints and examples.",
      why_it_matters: "Grounding the request reduces generic output and improves trustworthiness.",
      maps_to_reason_ids: ["reason_2"],
    });
  }

  if (reasonIds.has("reason_3")) {
    fixes.push({
      id: "fix_3",
      description: "State the desired answer format (checklist, steps, ranked picks) and the decision criteria.",
      why_it_matters: "Format cues help the AI organize the response and avoid irrelevant details.",
      maps_to_reason_ids: ["reason_3"],
    });
  }

  if (reasonIds.has("reason_4")) {
    fixes.push({
      id: "fix_4",
      description: "Include a grounding signal such as timeframe, audience, or data proof you expect the AI to cite.",
      why_it_matters: "Authority cues signal that the answer should be supported, not speculative.",
      maps_to_reason_ids: ["reason_4"],
    });
  }

  if (reasonIds.has("reason_5")) {
    fixes.push({
      id: "fix_5",
      description: "Add more descriptive body content that directly answers the query with clear evidence.",
      why_it_matters: "Richer on-page detail lets AI ground answers instead of guessing.",
      maps_to_reason_ids: ["reason_5"],
    });
  }

  if (reasonIds.has("reason_6")) {
    fixes.push({
      id: "fix_6",
      description: "Add H1–H3 headings that clarify the question and key sections users need.",
      why_it_matters: "Headings guide the AI to the right sections and reduce ambiguity.",
      maps_to_reason_ids: ["reason_6"],
    });
  }

  return fixes;
}

function scoreAnalysis(reasons: DiagnosisReason[], clarityScore: number, extraction?: AnalysisExtraction): AnalysisScoring {
  let score = 85;
  const explanation: string[] = [];

  reasons.forEach((reason) => {
    const penalty = reason.severity === "high" ? 18 : reason.severity === "medium" ? 10 : 6;
    score -= penalty;
    explanation.push(`${reason.title} reduces confidence because ${reason.detail}`);
  });

  score += Math.round((clarityScore - 60) / 4);

  if (extraction?.status === "partial") {
    score -= 8;
    explanation.push("Extraction was partial, so answers may be less grounded.");
  }

  return {
    aeo_score: Math.max(0, Math.min(100, score)),
    score_explanations: explanation.map((message, idx) => ({
      id: `score_${idx + 1}`,
      message,
    })),
  };
}

type ContentSignals = {
  mainTextLength: number;
  headingsCount: number;
  hasPaywallSignals: boolean;
};

function deriveContentSignals(extraction?: AnalysisExtraction): ContentSignals {
  const mainText = extraction?.content.main_text ?? "";
  const headings = extraction?.content.headings ?? [];
  const textLower = mainText.toLowerCase();
  const paywallCues = ["subscribe", "sign in to read", "paywall", "membership", "log in to continue"];
  const hasPaywallSignals = paywallCues.some((cue) => textLower.includes(cue));
  return {
    mainTextLength: mainText.trim().length,
    headingsCount: headings.length,
    hasPaywallSignals,
  };
}

export function generateAnalysis(params: {
  id: string;
  source: AnalysisSource;
  topicHint: string;
  context?: AnalysisContext;
  extraction?: AnalysisExtraction;
}): Analysis {
  const { id, source, topicHint, context = {}, extraction } = params;
  const signals = extractSignals(topicHint);
  const contentSignals = deriveContentSignals(extraction);
  const intent = deriveIntent(signals);
  const promptClusters = buildPromptClusters(signals, context);
  const clarity = scoreClarity(signals, contentSignals);
  const answerPresence = deriveAnswerPresence(signals);
  const structureIssues = gatherStructureIssues(signals, context, contentSignals, extraction);
  const reasons = buildReasons(signals, context, contentSignals, extraction);
  const fixes = buildFixes(reasons);
  const scoring = scoreAnalysis(reasons, clarity, extraction);
  const now = new Date().toISOString();

  return {
    id,
    analysis_version: ANALYSIS_VERSION,
    created_at: now,
    updated_at: now,
    source,
    context,
    extraction,
    prompt_intelligence: {
      dominant_intent: intent,
      intent_mismatch:
        intent === "ambiguous"
          ? "AI cannot tell whether the ask is informational, navigational, or transactional."
          : structureIssues.find((issue) => issue.toLowerCase().includes("not framed"))
          ? "The ask is implied rather than explicit, so the AI may answer the wrong question."
          : null,
      prompt_clusters: promptClusters,
    },
    aeo: {
      answer_clarity_score: clarity,
      answer_presence: answerPresence,
      structure_issues: structureIssues,
    },
    diagnosis: {
      blocking_reasons: reasons,
    },
    fixes: {
      recommended_fixes: fixes,
    },
    scoring,
  };
}

export function createAnalysisId(): string {
  return crypto.randomUUID();
}
