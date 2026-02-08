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
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT,
      current_period_end TIMESTAMPTZ,
      included_seats INTEGER NOT NULL DEFAULT 1,
      purchased_seats INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS team_memberships (
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (team_id, user_id),
      CONSTRAINT fk_team FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_team_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS team_invites (
      token TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      accepted_by TEXT,
      created_by TEXT NOT NULL,
      CONSTRAINT fk_invite_team FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
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
      user_id TEXT,
      team_id TEXT,
      name TEXT NOT NULL,
      primary_domain TEXT,
      industry TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      CONSTRAINT fk_project_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_project_team FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
  `;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id TEXT;`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_project_team'
      ) THEN
        ALTER TABLE projects
        ADD CONSTRAINT fk_project_team FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE;
      END IF;
    END $$;
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

  await sql`
    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ,
      CONSTRAINT fk_share_analysis FOREIGN KEY(analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
      CONSTRAINT fk_share_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT share_links_analysis_unique UNIQUE (analysis_id)
    );
  `;
  // Ensure the unique constraint exists for ON CONFLICT (analysis_id)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS share_links_analysis_id_key ON share_links(analysis_id);`;

  await sql`
    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      export_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT NOT NULL,
      CONSTRAINT fk_export_analysis FOREIGN KEY(analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
      CONSTRAINT fk_export_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  // Create personal teams for users missing membership and backfill projects
  await sql`
    INSERT INTO teams (id, name, created_at)
    SELECT 'team-' || u.id, u.email || ' team', NOW()
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id)
  `;
  await sql`
    INSERT INTO team_memberships (team_id, user_id, role, created_at)
    SELECT 'team-' || u.id, u.id, 'owner', NOW()
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id)
    ON CONFLICT DO NOTHING;
  `;
  await sql`
    UPDATE projects p
    SET team_id = 'team-' || p.user_id
    WHERE team_id IS NULL AND p.user_id IS NOT NULL;
  `;
}
