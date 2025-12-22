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
"[project]/lib/persistence/memoryStore.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InMemoryAnalysisStore",
    ()=>InMemoryAnalysisStore,
    "analysisStore",
    ()=>analysisStore
]);
const globalStore = // eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.__analysisMemoryStore ?? {
    records: new Map()
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.__analysisMemoryStore = globalStore;
class InMemoryAnalysisStore {
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
        globalStore.records.set(id, record);
        return record;
    }
    saveAnalysis(id, analysis, status = "complete") {
        const record = globalStore.records.get(id);
        if (!record) return undefined;
        const updated = {
            ...record,
            analysis,
            status,
            updated_at: new Date().toISOString()
        };
        globalStore.records.set(id, updated);
        return updated;
    }
    markFailed(id, error) {
        const record = globalStore.records.get(id);
        if (!record) return undefined;
        const updated = {
            ...record,
            status: "failed",
            error,
            updated_at: new Date().toISOString()
        };
        globalStore.records.set(id, updated);
        return updated;
    }
    getRecord(id) {
        return globalStore.records.get(id);
    }
}
const analysisStore = new InMemoryAnalysisStore();
}),
"[project]/app/api/analyses/[analysis_id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$memoryStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/persistence/memoryStore.ts [app-route] (ecmascript)");
;
;
async function GET(_request, { params }) {
    const { analysis_id } = params;
    const record = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$memoryStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analysisStore"].getRecord(analysis_id);
    if (!record) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Analysis not found"
        }, {
            status: 404
        });
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        analysis_id: record.id,
        status: record.status,
        analysis: record.status === "complete" ? record.analysis : undefined,
        error: record.status === "failed" ? record.error ?? "Analysis failed" : undefined
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__de02eb9b._.js.map