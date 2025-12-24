import { sql } from "@vercel/postgres";

export async function ensureCoreTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      analyses_used_this_month INTEGER NOT NULL DEFAULT 0,
      last_reset_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      primary_domain TEXT,
      industry TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      CONSTRAINT fk_project_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      request JSONB NOT NULL,
      analysis JSONB,
      error TEXT,
      CONSTRAINT fk_analysis_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_analysis_project FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `;

  // Backfill columns if the table existed without new fields
  await sql`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS user_id TEXT;`;
  await sql`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS project_id TEXT;`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_analysis_user'
      ) THEN
        ALTER TABLE analyses
        ADD CONSTRAINT fk_analysis_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_analysis_project'
      ) THEN
        ALTER TABLE analyses
        ADD CONSTRAINT fk_analysis_project FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      project_id TEXT,
      analysis_id TEXT,
      plan TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      properties JSONB
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_user_created_at ON events (user_id, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_name_created_at ON events (event_name, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_project_created_at ON events (project_id, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_analysis ON events (analysis_id);`;
}
