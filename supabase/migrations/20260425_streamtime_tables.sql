-- supabase/migrations/20260425_streamtime_tables.sql
-- Run this in the Supabase dashboard SQL editor or via `supabase db push`.

-- Org-level settings (OOO phrase)
CREATE TABLE IF NOT EXISTS streamtime_settings (
  org_id      TEXT PRIMARY KEY DEFAULT 'default',
  ooo_phrase  TEXT NOT NULL DEFAULT 'out of office',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

INSERT INTO streamtime_settings (org_id)
VALUES ('default')
ON CONFLICT (org_id) DO NOTHING;

-- Per-user billable % targets
CREATE TABLE IF NOT EXISTS streamtime_user_targets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               TEXT NOT NULL DEFAULT 'default',
  streamtime_user_id   TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  target_pct           NUMERIC(5,2) NOT NULL
                         CHECK (target_pct >= 0 AND target_pct <= 100),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_by           UUID REFERENCES auth.users(id),
  UNIQUE (org_id, streamtime_user_id)
);

-- Saved weekly report metadata
CREATE TABLE IF NOT EXISTS streamtime_weekly_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL DEFAULT 'default',
  date_from    DATE NOT NULL,
  date_to      DATE NOT NULL,
  entry_count  INTEGER NOT NULL DEFAULT 0,
  saved_by     UUID REFERENCES auth.users(id),
  saved_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, date_from, date_to)
);

-- Aggregated per-user stats for each saved report
CREATE TABLE IF NOT EXISTS streamtime_weekly_user_stats (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id            UUID NOT NULL
                         REFERENCES streamtime_weekly_reports(id)
                         ON DELETE CASCADE,
  streamtime_user_id   TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  team                 TEXT NOT NULL,
  is_leadership        BOOLEAN NOT NULL DEFAULT FALSE,
  capacity_hours       NUMERIC(8,2) NOT NULL DEFAULT 0,
  billable_hours       NUMERIC(8,2) NOT NULL DEFAULT 0,
  non_billable_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  ooo_hours            NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_hours          NUMERIC(8,2) NOT NULL DEFAULT 0,
  working_hours        NUMERIC(8,2) NOT NULL DEFAULT 0,
  billable_pct         NUMERIC(5,4) NOT NULL DEFAULT 0,
  target_pct           NUMERIC(5,2),
  diff_pct             NUMERIC(6,4)
);
