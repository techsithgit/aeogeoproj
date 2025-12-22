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
"[project]/app/api/analyses/[analysis_id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/persistence/fileStore.ts [app-route] (ecmascript)");
;
;
async function GET(_request, context) {
    const { analysis_id } = await context.params;
    const record = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analysisStore"].getRecord(analysis_id);
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

//# sourceMappingURL=%5Broot-of-the-server%5D__2dc701b4._.js.map