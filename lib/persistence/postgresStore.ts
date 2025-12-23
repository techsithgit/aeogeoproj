import { sql } from "@vercel/postgres";
import { Analysis, AnalysisContext, AnalysisRecord, AnalysisSource, AnalysisStatus } from "../analysis/types";
import { AnalysisStore } from "./types";

const TABLE_NAME = sanitizeTableName(process.env.ANALYSIS_TABLE_NAME || "analyses");

function sanitizeTableName(name: string): string {
  // Allow alphanumeric and underscores only to avoid injection on identifiers.
  return /^[A-Za-z0-9_]+$/.test(name) ? name : "analyses";
}

async function ensureTable() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      request JSONB NOT NULL,
      analysis JSONB,
      error TEXT
    );
  `);
}

export class PostgresAnalysisStore implements AnalysisStore {
  private ensured = false;

  private async ensure() {
    if (!this.ensured) {
      await ensureTable();
      this.ensured = true;
    }
  }

  async createRecord(
    id: string,
    source: AnalysisSource,
    context: AnalysisContext,
    status: AnalysisStatus,
    userId?: string,
    projectId?: string,
    includeDifferentiators?: boolean
  ): Promise<AnalysisRecord> {
    await this.ensure();
    const now = new Date().toISOString();
    const record: AnalysisRecord = {
      id,
      status,
      created_at: now,
      updated_at: now,
      user_id: userId,
      project_id: projectId,
      request: { source, context },
    };
    record.request.include_differentiators = includeDifferentiators;
    record.request.project_id = projectId;
    await sql.query(
      `
        INSERT INTO "${TABLE_NAME}" (id, user_id, project_id, status, created_at, updated_at, request)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            user_id = EXCLUDED.user_id,
            project_id = EXCLUDED.project_id,
            updated_at = EXCLUDED.updated_at,
            request = EXCLUDED.request;
      `,
      [record.id, userId ?? null, projectId ?? null, record.status, record.created_at, record.updated_at, record.request]
    );
    return record;
  }

  async saveAnalysis(id: string, analysis: Analysis, status: AnalysisStatus = "complete"): Promise<AnalysisRecord | undefined> {
    await this.ensure();
    const existing = await this.getRecord(id);
    if (!existing) return undefined;
    const updated: AnalysisRecord = {
      ...existing,
      analysis,
      status,
      updated_at: new Date().toISOString(),
    };
    await sql.query(
      `
      UPDATE "${TABLE_NAME}"
      SET status = $1,
          updated_at = $2,
          analysis = $3
        WHERE id = $4;
      `,
      [updated.status, updated.updated_at, updated.analysis ?? null, id]
    );
    return updated;
  }

  async markFailed(id: string, error: string): Promise<AnalysisRecord | undefined> {
    await this.ensure();
    const existing = await this.getRecord(id);
    if (!existing) return undefined;
    const updated: AnalysisRecord = {
      ...existing,
      status: "failed",
      error,
      updated_at: new Date().toISOString(),
    };
    await sql.query(
      `
        UPDATE "${TABLE_NAME}"
        SET status = $1,
            updated_at = $2,
            error = $3
        WHERE id = $4;
      `,
      [updated.status, updated.updated_at, updated.error ?? null, id]
    );
    return updated;
  }

  async getRecord(id: string): Promise<AnalysisRecord | undefined> {
    await this.ensure();
    const result = await sql.query(
      `
        SELECT id, user_id, project_id, status, created_at, updated_at, request, analysis, error
        FROM "${TABLE_NAME}"
        WHERE id = $1
        LIMIT 1;
      `,
      [id]
    );
    if (!result.rowCount) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id as string | undefined,
      project_id: row.project_id as string | undefined,
      status: row.status as AnalysisStatus,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      request: row.request as AnalysisRecord["request"],
      analysis: row.analysis as Analysis | undefined,
      error: row.error as string | undefined,
    };
  }
}

export const postgresAnalysisStore = new PostgresAnalysisStore();
