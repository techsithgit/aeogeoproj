import crypto from "crypto";
import {
  Analysis,
  AnalysisContext,
  AnalysisExtraction,
  AnalysisScoring,
  AnalysisSource,
  AnalysisDifferentiators,
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

function detectFirstPartySignals(extraction?: AnalysisExtraction): {
  presence: "none" | "weak" | "strong";
  detected_types: ("original_data" | "lived_experience" | "proprietary_framework" | "unique_examples")[];
  gaps: string[];
} {
  if (!extraction || extraction.status === "failed") {
    return { presence: "none", detected_types: [], gaps: ["No extracted content to assess first-party signals."] };
  }
  const text = (extraction.content.main_text || "").toLowerCase();
  const headings = (extraction.content.headings || []).map((h) => h.toLowerCase());
  const detected: ("original_data" | "lived_experience" | "proprietary_framework" | "unique_examples")[] = [];
  const gaps: string[] = [];

  if (/\bwe (conducted|ran|surveyed|measured|tested)\b/.test(text) || /\bdata\b/.test(text)) {
    detected.push("original_data");
  }
  if (/\bwe (built|created|developed)\b/.test(text) && /\bframework\b/.test(text)) {
    detected.push("proprietary_framework");
  }
  if (/\bmy experience\b|\bour experience\b|\bwe learned\b/.test(text)) {
    detected.push("lived_experience");
  }
  if (headings.some((h) => /case study|example|examples|lessons/.test(h)) || /\bfor example\b|\bfor instance\b/.test(text)) {
    detected.push("unique_examples");
  }

  let presence: "none" | "weak" | "strong" = "none";
  if (detected.length === 0) {
    gaps.push("Add first-party signals (data, case examples, frameworks).");
  } else if (detected.length === 1) {
    presence = "weak";
    gaps.push("Expand first-party signals beyond a single mention.");
  } else {
    presence = "strong";
  }

  return { presence, detected_types: detected, gaps };
}

function classifyCitationProfile(extraction?: AnalysisExtraction): {
  current_type: "authority" | "list" | "example" | "definition";
  confidence_level: "low" | "medium" | "high";
  requirements_to_upgrade: { target_type: "authority" | "list" | "example" | "definition"; missing_signals: string[] }[];
} {
  const text = (extraction?.content.main_text || "").toLowerCase();
  const headings = (extraction?.content.headings || []).map((h) => h.toLowerCase());

  let current_type: "authority" | "list" | "example" | "definition" = "definition";
  let confidence: "low" | "medium" | "high" = "low";
  const missingForAuthority: string[] = [];
  const missingForList: string[] = [];

  const hasDefinitionTone = /\bis\s|\bare\s|\brefers to\b/.test(text.slice(0, 200));
  const hasListSignals = headings.some((h) => /top|best|list|vs|versus/.test(h)) || /\b\d+\./.test(text);
  const hasRecommendation = /\bshould\b|\brecommend\b|\bbest\b|\bchoose\b/.test(text);
  const hasCriteria = /\bbecause\b|\bdue to\b|\bbased on\b/.test(text) || /criteria|factors/.test(text);

  if (hasListSignals) {
    current_type = "list";
    confidence = "medium";
  }
  if (hasRecommendation && hasCriteria) {
    current_type = "authority";
    confidence = "high";
  } else if (hasRecommendation) {
    current_type = "authority";
    confidence = "medium";
  } else if (hasDefinitionTone) {
    current_type = "definition";
    confidence = "medium";
  }
  if (/\bfor example\b|\bfor instance\b/.test(text)) {
    current_type = "example";
    confidence = "medium";
  }

  if (!hasCriteria) missingForAuthority.push("State explicit criteria or justification for recommendations.");
  if (!hasRecommendation) missingForAuthority.push("Provide a clear recommendation or decisive stance.");
  if (!hasListSignals) missingForList.push("Use clear list structure or headings (Top/Best) to signal a list answer.");

  return {
    current_type,
    confidence_level: confidence,
    requirements_to_upgrade: [
      { target_type: "authority", missing_signals: missingForAuthority },
      { target_type: "list", missing_signals: missingForList },
    ],
  };
}

function deriveFragility(
  firstParty: ReturnType<typeof detectFirstPartySignals>,
  reasons: DiagnosisReason[],
  extraction?: AnalysisExtraction
): { status: "stable" | "at_risk" | "fragile"; fragility_score: number; drivers: { driver_type: string; explanation: string; related_reason_ids?: string[] }[] } {
  let score = 70;
  const drivers: { driver_type: string; explanation: string; related_reason_ids?: string[] }[] = [];

  if (firstParty.presence === "none") {
    score -= 20;
    drivers.push({
      driver_type: "first_party_absent",
      explanation: "No first-party signals detected, so answers rely on generic knowledge.",
      related_reason_ids: reasons.map((r) => r.id),
    });
  } else if (firstParty.presence === "weak") {
    score -= 10;
    drivers.push({
      driver_type: "first_party_weak",
      explanation: "Only limited first-party signals detected, reducing authority.",
      related_reason_ids: reasons.map((r) => r.id),
    });
  }

  if (extraction?.status === "partial") {
    score -= 10;
    drivers.push({
      driver_type: "extraction_partial",
      explanation: "Extraction was partial, so evidence may be incomplete.",
    });
  }

  const highReasons = reasons.filter((r) => r.severity === "high").map((r) => r.id);
  if (highReasons.length) {
    score -= 8;
    drivers.push({
      driver_type: "blocking_reasons",
      explanation: "Blocking reasons remain unresolved, increasing fragility.",
      related_reason_ids: highReasons,
    });
  }

  const status = score >= 70 ? "stable" : score >= 45 ? "at_risk" : "fragile";
  return { status, fragility_score: Math.max(0, Math.min(100, score)), drivers };
}

function deriveGeoSensitivity(
  signals: TopicSignals,
  extraction?: AnalysisExtraction
): { level: "low" | "medium" | "high"; explanation: string; implications: "global_authority_sufficient" | "local_context_required" } {
  const text = (extraction?.content.main_text || "").toLowerCase();
  const headings = (extraction?.content.headings || []).map((h) => h.toLowerCase());
  const hasLocationWords = signals.hasGeoCue || /near me|in [A-Za-z]|city|state|province/.test(text) || headings.some((h) => /near|in\b/.test(h));
  if (hasLocationWords) {
    return {
      level: "medium",
      explanation: "Prompt or content includes location-sensitive language, so local context matters.",
      implications: "local_context_required",
    };
  }
  return {
    level: "low",
    explanation: "No strong geo cues detected; global authority may suffice.",
    implications: "global_authority_sufficient",
  };
}

function deriveFixPriority(fixes: RecommendedFix[], reasons: DiagnosisReason[]): { ordered_fixes: { fix_id: string; priority: "now" | "next" | "later"; rationale: string }[] } {
  const reasonSeverity = new Map(reasons.map((r) => [r.id, r.severity]));
  const ordered = fixes.map((fix) => {
    const hasHigh = fix.maps_to_reason_ids.some((r) => reasonSeverity.get(r) === "high");
    const hasMedium = fix.maps_to_reason_ids.some((r) => reasonSeverity.get(r) === "medium");
    const priority: "now" | "next" | "later" = hasHigh ? "now" : hasMedium ? "next" : "later";
    const rationale = hasHigh
      ? "Addresses a high-severity blocker."
      : hasMedium
      ? "Addresses a medium-severity blocker."
      : "Addresses a lower-severity issue.";
    return { fix_id: fix.id, priority, rationale };
  });
  ordered.sort((a, b) => {
    const order = { now: 0, next: 1, later: 2 };
    return order[a.priority] - order[b.priority];
  });
  return { ordered_fixes: ordered };
}

function buildDifferentiators(
  reasons: DiagnosisReason[],
  fixes: RecommendedFix[],
  extraction: AnalysisExtraction | undefined,
  signals: TopicSignals,
  _context: AnalysisContext,
  _contentSignals: ContentSignals
): AnalysisDifferentiators {
  const firstParty = detectFirstPartySignals(extraction);
  const citation = classifyCitationProfile(extraction);
  const fragility = deriveFragility(firstParty, reasons, extraction);
  const geo = deriveGeoSensitivity(signals, extraction);
  const fixPriority = deriveFixPriority(fixes, reasons);

  return {
    answer_fragility: fragility,
    citation_profile: citation,
    first_party_signals: firstParty,
    geo_sensitivity: geo,
    fix_priority: fixPriority,
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
  includeDifferentiators?: boolean;
}): Analysis {
  const { id, source, topicHint, context = {}, extraction, includeDifferentiators } = params;
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
  const differentiators = includeDifferentiators
    ? buildDifferentiators(reasons, fixes, extraction, signals, context, contentSignals)
    : undefined;
  const now = new Date().toISOString();

  return {
    id,
    analysis_version: ANALYSIS_VERSION,
    status: "complete",
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
    differentiators,
  };
}

export function createAnalysisId(): string {
  return crypto.randomUUID();
}
