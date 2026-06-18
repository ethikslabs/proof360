-- Journey (HRR v1): session-as-evidence needs queryable per-session metadata on evidence.
-- Additive only — no data migration. evidence.collected_at already exists (the timeline key).
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS extensions JSONB;
