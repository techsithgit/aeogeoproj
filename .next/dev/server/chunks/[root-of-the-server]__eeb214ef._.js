module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/analysis/engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAnalysisId",
    ()=>createAnalysisId,
    "generateAnalysis",
    ()=>generateAnalysis
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const ANALYSIS_VERSION = "v1";
const questionWords = [
    "who",
    "what",
    "when",
    "where",
    "why",
    "how"
];
const comparisonWords = [
    "vs",
    "versus",
    "compare",
    "comparison",
    "against"
];
const superlatives = [
    "best",
    "top",
    "leading",
    "most"
];
const transactionalWords = [
    "buy",
    "price",
    "pricing",
    "cost",
    "deal",
    "order",
    "book"
];
const geoWords = [
    "near me",
    "in ",
    "at ",
    "around",
    "closest",
    "local"
];
function extractSignals(topic) {
    const normalized = topic.trim();
    const lower = normalized.toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    const hasQuestionWord = words.some((w)=>questionWords.includes(w.toLowerCase()));
    const hasQuestionMark = normalized.includes("?");
    const hasComparison = comparisonWords.some((w)=>lower.includes(w));
    const hasBestSuperlative = superlatives.some((w)=>lower.includes(w));
    const hasTransactionalCue = transactionalWords.some((w)=>lower.includes(w));
    const hasGeoCue = geoWords.some((w)=>lower.includes(w));
    return {
        normalized,
        lower,
        words,
        hasQuestionWord,
        hasQuestionMark,
        hasComparison,
        hasBestSuperlative,
        hasTransactionalCue,
        hasGeoCue
    };
}
function deriveIntent(signals) {
    if (signals.hasTransactionalCue) {
        return "transactional";
    }
    if (signals.hasQuestionWord || signals.hasComparison || signals.hasBestSuperlative) {
        return "informational";
    }
    if (signals.hasGeoCue) {
        return "navigational";
    }
    return "ambiguous";
}
function buildPromptClusters(signals, context) {
    const clusters = [];
    clusters.push({
        label: "specificity",
        signals: [
            signals.words.length >= 4 ? "has multi-word intent" : "ultra-short topic",
            signals.hasComparison ? "comparison cue" : "no comparison cue",
            signals.hasBestSuperlative ? "seeks ranked guidance" : "no ranking cue"
        ]
    });
    clusters.push({
        label: "context",
        signals: [
            context.location ? `location: ${context.location}` : "location missing",
            context.industry ? `industry: ${context.industry}` : "industry missing",
            signals.hasGeoCue ? "geo phrasing in topic" : "no geo phrasing in topic"
        ]
    });
    clusters.push({
        label: "actionability",
        signals: [
            signals.hasTransactionalCue ? "action/transaction cue" : "no action cue",
            signals.hasQuestionMark || signals.hasQuestionWord ? "explicit ask" : "implicit ask"
        ]
    });
    return clusters;
}
function scoreClarity(signals) {
    let score = 80;
    if (signals.words.length < 3) score -= 20;
    if (signals.words.length > 8) score += 5;
    if (!signals.hasQuestionMark && !signals.hasQuestionWord) score -= 10;
    if (signals.hasComparison || signals.hasBestSuperlative) score += 5;
    if (signals.hasTransactionalCue) score += 5;
    return Math.min(100, Math.max(0, score));
}
function deriveAnswerPresence(signals) {
    if (signals.hasQuestionWord || signals.hasQuestionMark) return "clear";
    if (signals.hasTransactionalCue || signals.hasComparison || signals.hasBestSuperlative) return "partial";
    return "missing";
}
function gatherStructureIssues(signals, context) {
    const issues = [];
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
    return issues;
}
function buildReasons(signals, context) {
    const reasons = [];
    const intent = deriveIntent(signals);
    reasons.push({
        id: "reason_1",
        title: "Ambiguous intent",
        detail: intent === "ambiguous" ? "The topic does not declare whether the expected answer is informational, navigational, or transactional." : "The topic leaves room for multiple interpretations, so an AI answer may not match the user's real goal.",
        severity: "high",
        rank: 1
    });
    reasons.push({
        id: "reason_2",
        title: "Missing context",
        detail: context.location || context.industry ? "Context is partial; AI still lacks clear guardrails to ground the answer." : "No location or industry anchor is provided, so the answer will stay generic and less trustworthy.",
        severity: context.location || context.industry ? "medium" : "high",
        rank: 2
    });
    reasons.push({
        id: "reason_3",
        title: "Unstated answer format",
        detail: signals.hasQuestionWord || signals.hasQuestionMark ? "The question is asked, but the expected format (checklist, steps, ranked list) is not specified." : "The topic is not phrased as a question, so the AI must guess the answer shape.",
        severity: "medium",
        rank: 3
    });
    if (!signals.hasTransactionalCue && !signals.hasBestSuperlative) {
        reasons.push({
            id: "reason_4",
            title: "Weak authority signals",
            detail: "There are no qualifiers (e.g., timeframe, data points, audience) that would signal reliability.",
            severity: "low",
            rank: 4
        });
    }
    return reasons.slice(0, 5);
}
function buildFixes(reasons) {
    const fixes = [];
    const reasonIds = new Set(reasons.map((r)=>r.id));
    if (reasonIds.has("reason_1")) {
        fixes.push({
            id: "fix_1",
            description: "Rewrite the topic to name the exact action or decision you want (e.g., 'How to choose X for Y outcome').",
            why_it_matters: "Explicit intent lets the AI choose a fitting reasoning path instead of guessing.",
            maps_to_reason_ids: [
                "reason_1"
            ]
        });
    }
    if (reasonIds.has("reason_2")) {
        fixes.push({
            id: "fix_2",
            description: "Add location or industry qualifiers so the answer uses relevant constraints and examples.",
            why_it_matters: "Grounding the request reduces generic output and improves trustworthiness.",
            maps_to_reason_ids: [
                "reason_2"
            ]
        });
    }
    if (reasonIds.has("reason_3")) {
        fixes.push({
            id: "fix_3",
            description: "State the desired answer format (checklist, steps, ranked picks) and the decision criteria.",
            why_it_matters: "Format cues help the AI organize the response and avoid irrelevant details.",
            maps_to_reason_ids: [
                "reason_3"
            ]
        });
    }
    if (reasonIds.has("reason_4")) {
        fixes.push({
            id: "fix_4",
            description: "Include a grounding signal such as timeframe, audience, or data proof you expect the AI to cite.",
            why_it_matters: "Authority cues signal that the answer should be supported, not speculative.",
            maps_to_reason_ids: [
                "reason_4"
            ]
        });
    }
    return fixes;
}
function scoreAnalysis(reasons, clarityScore) {
    let score = 85;
    const explanation = [];
    reasons.forEach((reason)=>{
        const penalty = reason.severity === "high" ? 18 : reason.severity === "medium" ? 10 : 6;
        score -= penalty;
        explanation.push(`${reason.title} reduces confidence because ${reason.detail}`);
    });
    score += Math.round((clarityScore - 60) / 4);
    return {
        aeo_score: Math.max(0, Math.min(100, score)),
        score_explanations: explanation.map((message, idx)=>({
                id: `score_${idx + 1}`,
                message
            }))
    };
}
function generateAnalysis(id, topic, context = {}) {
    const signals = extractSignals(topic);
    const intent = deriveIntent(signals);
    const promptClusters = buildPromptClusters(signals, context);
    const clarity = scoreClarity(signals);
    const answerPresence = deriveAnswerPresence(signals);
    const structureIssues = gatherStructureIssues(signals, context);
    const reasons = buildReasons(signals, context);
    const fixes = buildFixes(reasons);
    const scoring = scoreAnalysis(reasons, clarity);
    const now = new Date().toISOString();
    return {
        id,
        analysis_version: ANALYSIS_VERSION,
        created_at: now,
        updated_at: now,
        source: {
            type: "topic",
            value: topic
        },
        context,
        prompt_intelligence: {
            dominant_intent: intent,
            intent_mismatch: intent === "ambiguous" ? "AI cannot tell whether the ask is informational, navigational, or transactional." : structureIssues.find((issue)=>issue.toLowerCase().includes("not framed")) ? "The ask is implied rather than explicit, so the AI may answer the wrong question." : null,
            prompt_clusters: promptClusters
        },
        aeo: {
            answer_clarity_score: clarity,
            answer_presence: answerPresence,
            structure_issues: structureIssues
        },
        diagnosis: {
            blocking_reasons: reasons
        },
        fixes: {
            recommended_fixes: fixes
        },
        scoring
    };
}
function createAnalysisId() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID();
}
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/lib/persistence/fileStore.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FileAnalysisStore",
    ()=>FileAnalysisStore,
    "analysisStore",
    ()=>analysisStore
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
const primaryStorePath = process.env.ANALYSIS_STORE_PATH || __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), ".next", "analysis-store.json");
const fallbackPaths = [
    primaryStorePath,
    __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), "analysis-store.json"),
    "/tmp/analysis-store.json"
];
const globalStore = // eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.__analysisHybridStore ?? {
    memory: new Map()
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.__analysisHybridStore = globalStore;
function ensureStoreDir(filePath) {
    const dir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(filePath);
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(dir)) {
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(dir, {
            recursive: true
        });
    }
}
function loadAllStores() {
    const merged = {};
    for (const candidate of fallbackPaths){
        try {
            const contents = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(candidate, "utf-8");
            const parsed = JSON.parse(contents);
            Object.assign(merged, parsed);
        } catch  {
        // ignore missing/invalid files
        }
    }
    return merged;
}
function persistStore(data) {
    ensureStoreDir(primaryStorePath);
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(primaryStorePath, JSON.stringify(data, null, 2), "utf-8");
}
function syncMemoryFromDisk() {
    const data = loadAllStores();
    Object.entries(data).forEach(([id, record])=>{
        globalStore.memory.set(id, record);
    });
}
syncMemoryFromDisk();
class FileAnalysisStore {
    createRecord(id, topic, context, status) {
        const now = new Date().toISOString();
        const record = {
            id,
            status,
            created_at: now,
            updated_at: now,
            request: {
                topic,
                context
            }
        };
        globalStore.memory.set(id, record);
        const merged = {
            ...loadAllStores(),
            [id]: record
        };
        persistStore(merged);
        return record;
    }
    saveAnalysis(id, analysis, status = "complete") {
        const existing = this.getRecord(id);
        if (!existing) return undefined;
        const updated = {
            ...existing,
            analysis,
            status,
            updated_at: new Date().toISOString()
        };
        globalStore.memory.set(id, updated);
        const merged = {
            ...loadAllStores(),
            [id]: updated
        };
        persistStore(merged);
        return updated;
    }
    markFailed(id, error) {
        const existing = this.getRecord(id);
        if (!existing) return undefined;
        const updated = {
            ...existing,
            status: "failed",
            error,
            updated_at: new Date().toISOString()
        };
        globalStore.memory.set(id, updated);
        const merged = {
            ...loadAllStores(),
            [id]: updated
        };
        persistStore(merged);
        return updated;
    }
    getRecord(id) {
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
const analysisStore = new FileAnalysisStore();
}),
"[project]/app/api/analyses/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$analysis$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/analysis/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/persistence/fileStore.ts [app-route] (ecmascript)");
;
;
;
async function POST(request) {
    try {
        const body = await request.json();
        const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
        if (!topic) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "topic is required"
            }, {
                status: 400
            });
        }
        const context = body?.context ?? {};
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$analysis$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAnalysisId"])();
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analysisStore"].createRecord(id, topic, context, "processing");
        const analysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$analysis$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateAnalysis"])(id, topic, context);
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analysisStore"].saveAnalysis(id, analysis, "complete");
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            analysis_id: id,
            status: "complete",
            analysis
        });
    } catch (_error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unable to create analysis"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__eeb214ef._.js.map