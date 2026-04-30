-- supabase/migrations/20260501_paid_our_worth.sql
-- Paid Our Worth: weekly billable time vs revenue tracker.

-- Per-month revenue list (uploaded via CSV by admins)
CREATE TABLE IF NOT EXISTS paid_our_worth_revenue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL DEFAULT 'default',
  period_month    DATE NOT NULL,                  -- first day of month
  job_id          TEXT NOT NULL,
  job_name        TEXT NOT NULL,
  revenue_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  UNIQUE (org_id, period_month, job_id)
);

CREATE INDEX IF NOT EXISTS idx_paid_our_worth_revenue_period
  ON public.paid_our_worth_revenue (org_id, period_month);

-- Weekly snapshot header
CREATE TABLE IF NOT EXISTS paid_our_worth_snapshot (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   TEXT NOT NULL DEFAULT 'default',
  period_month             DATE NOT NULL,
  cutoff_date              DATE NOT NULL,
  working_days_in_month    INTEGER NOT NULL,
  days_worked              INTEGER NOT NULL,
  total_billable_time      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_non_billable_time  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_revenue            NUMERIC(14,2) NOT NULL DEFAULT 0,
  report_total             NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance                 NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  created_by               UUID REFERENCES auth.users(id),
  UNIQUE (org_id, cutoff_date)
);

CREATE INDEX IF NOT EXISTS idx_paid_our_worth_snapshot_period
  ON public.paid_our_worth_snapshot (org_id, period_month, cutoff_date DESC);

-- Per-job rows captured at snapshot time
CREATE TABLE IF NOT EXISTS paid_our_worth_snapshot_row (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id   UUID NOT NULL
                  REFERENCES paid_our_worth_snapshot(id)
                  ON DELETE CASCADE,
  job_id        TEXT NOT NULL,
  job_name      TEXT NOT NULL,
  is_billable   BOOLEAN NOT NULL,
  current_time_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,  -- sum totalExTax
  revenue_amount       NUMERIC(14,2),                     -- null for non-billable
  time_left            NUMERIC(14,2),                     -- revenue - current_time
  pct_of_total         NUMERIC(7,4),                      -- non-billable only
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_paid_our_worth_snapshot_row_snapshot
  ON public.paid_our_worth_snapshot_row (snapshot_id);

-- Rolling per-month per-job collaborative notes
CREATE TABLE IF NOT EXISTS paid_our_worth_note (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        TEXT NOT NULL DEFAULT 'default',
  period_month  DATE NOT NULL,
  job_id        TEXT NOT NULL,
  column_key    TEXT NOT NULL,            -- 'marti_response' | 'response'
  body          TEXT NOT NULL DEFAULT '',
  author_id     UUID REFERENCES auth.users(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, period_month, job_id, column_key)
);

CREATE INDEX IF NOT EXISTS idx_paid_our_worth_note_lookup
  ON public.paid_our_worth_note (org_id, period_month, job_id);
