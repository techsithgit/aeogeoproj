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
    "fileAnalysisStore",
    ()=>fileAnalysisStore
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
    async createRecord(id, topic, context, status) {
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
    async saveAnalysis(id, analysis, status = "complete") {
        const existing = await this.getRecord(id);
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
    async markFailed(id, error) {
        const existing = await this.getRecord(id);
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
    async getRecord(id) {
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
const fileAnalysisStore = new FileAnalysisStore();
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/lib/persistence/kvStore.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VercelKVStore",
    ()=>VercelKVStore,
    "kvAnalysisStore",
    ()=>kvAnalysisStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$vercel$2f$kv$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@vercel/kv/dist/index.js [app-route] (ecmascript)");
;
const KV_PREFIX = process.env.ANALYSIS_KV_PREFIX || "analysis";
function key(id) {
    return `${KV_PREFIX}:${id}`;
}
class VercelKVStore {
    async createRecord(id, topic, context, status) {
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
        await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$vercel$2f$kv$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].set(key(id), record);
        return record;
    }
    async saveAnalysis(id, analysis, status = "complete") {
        const existing = await this.getRecord(id);
        if (!existing) return undefined;
        const updated = {
            ...existing,
            analysis,
            status,
            updated_at: new Date().toISOString()
        };
        await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$vercel$2f$kv$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].set(key(id), updated);
        return updated;
    }
    async markFailed(id, error) {
        const existing = await this.getRecord(id);
        if (!existing) return undefined;
        const updated = {
            ...existing,
            status: "failed",
            error,
            updated_at: new Date().toISOString()
        };
        await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$vercel$2f$kv$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].set(key(id), updated);
        return updated;
    }
    async getRecord(id) {
        const record = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$vercel$2f$kv$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].get(key(id));
        return record ?? undefined;
    }
}
const kvAnalysisStore = new VercelKVStore();
}),
"[project]/lib/persistence/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAnalysisStore",
    ()=>getAnalysisStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/persistence/fileStore.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$kvStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/persistence/kvStore.ts [app-route] (ecmascript)");
;
;
const provider = process.env.ANALYSIS_STORE_PROVIDER || "file";
function getAnalysisStore() {
    if (provider === "kv") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$kvStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvAnalysisStore"];
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$fileStore$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fileAnalysisStore"];
}
}),
"[project]/app/api/analyses/[analysis_id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/persistence/index.ts [app-route] (ecmascript)");
;
;
async function GET(_request, context) {
    const { analysis_id } = await context.params;
    const store = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$persistence$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAnalysisStore"])();
    const record = await store.getRecord(analysis_id);
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

//# sourceMappingURL=%5Broot-of-the-server%5D__7aebafaa._.js.map