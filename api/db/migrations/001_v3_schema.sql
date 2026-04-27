-- proof360 v3.0 — Postgres schema migration
-- Convergence lock §5 compliant
-- All 6 relational tables + 3 append-only event tables + indexes

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Relational Tables (ordered by FK dependencies)
-- ============================================================

-- Tenants (no FK deps — must precede sessions)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domains TEXT[],
  vendor_catalog_filter TEXT[],
  partner_branch TEXT CHECK (partner_branch IN ('distributor', 'vendor', 'internal')),
  priority INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'tier1', 'tier2_published', 'expired'))
);

-- Signals
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  field TEXT NOT NULL,
  inferred_value TEXT,
  inferred_source TEXT,
  inferred_at TIMESTAMPTZ,
  current_value TEXT,
  current_actor TEXT,
  status TEXT NOT NULL DEFAULT 'inferred'
    CHECK (status IN ('inferred', 'overridden', 'conflicted')),
  UNIQUE (session_id, field)
);

-- Gaps
CREATE TABLE gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  gap_def_id TEXT NOT NULL,
  triggered BOOLEAN NOT NULL DEFAULT false,
  severity TEXT,
  framework_impact JSONB,
  evidence JSONB,
  veritas_claim_id UUID,
  veritas_class TEXT CHECK (veritas_class IN ('ATTESTED', 'INFERRED', 'UNKNOWN') OR veritas_class IS NULL),
  veritas_confidence NUMERIC,
  attested_at TIMESTAMPTZ,
  UNIQUE (session_id, gap_def_id)
);

-- Recon Outputs (lock §5 amendment)
CREATE TABLE recon_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  source TEXT NOT NULL
    CHECK (source IN ('dns', 'http', 'certs', 'ip', 'github', 'jobs', 'hibp', 'ports', 'ssllabs', 'abuseipdb')),
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  UNIQUE (session_id, source)
);

-- Engagements
CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  selected_branch TEXT NOT NULL CHECK (selected_branch IN ('john', 'distributor', 'vendor')),
  routed_tenant_id UUID REFERENCES tenants(id),
  vendor_id TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'routed', 'accepted', 'rejected', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  email TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);

-- ============================================================
-- Append-Only Event Tables
-- ============================================================

-- Signal Events (input mutation audit)
CREATE TABLE signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES signals(id),
  event_type TEXT NOT NULL
    CHECK (event_type IN ('inferred', 'overridden', 'rescanned', 'conflict_resolved')),
  actor TEXT NOT NULL,
  reason TEXT,
  prior_value TEXT,
  new_value TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Engagement Events (commercial state transition audit)
CREATE TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id),
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'routed', 'accepted', 'rejected', 'converted')),
  actor TEXT NOT NULL,
  metadata JSONB,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attribution Ledger (money tracking)
CREATE TABLE attribution_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id),
  party TEXT NOT NULL,
  share_percentage NUMERIC,
  expected_amount NUMERIC,
  expected_date DATE,
  confirmed_amount NUMERIC,
  confirmed_date DATE,
  received_amount NUMERIC,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'expected'
    CHECK (status IN ('expected', 'confirmed', 'received', 'disputed'))
);

-- ============================================================
-- Indexes (convergence lock §5)
-- ============================================================

CREATE INDEX idx_signals_session ON signals(session_id);
CREATE INDEX idx_gaps_session ON gaps(session_id);
CREATE INDEX idx_recon_outputs_session ON recon_outputs(session_id);
CREATE INDEX idx_signal_events_signal ON signal_events(signal_id);
CREATE INDEX idx_engagement_events_engagement ON engagement_events(engagement_id);
CREATE INDEX idx_attribution_engagement ON attribution_ledger(engagement_id);
CREATE INDEX idx_engagements_session ON engagements(session_id);
CREATE INDEX idx_leads_session ON leads(session_id);
CREATE INDEX idx_tenants_branch ON tenants(partner_branch);

COMMIT;
