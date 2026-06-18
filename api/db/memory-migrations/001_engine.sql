-- proof360 memory engine — VENDORED from the CORPUS substrate engine.
-- Source of truth: CORPUS/migrations/001_corpus_graph.sql + 002_cutover.sql (consolidated to
-- their post-002 final state). This is the "share the engine, not the pile" boundary: proof360
-- runs the same canonical graph engine as CORPUS, against its OWN separate database.
--   DRIFT FLAG: this is a vendored copy. If CORPUS's engine changes, re-vendor. There is no
--   cross-repo import at deploy time (separate git repos / S3 deploy), so a copy is the floor.
-- Conformance: DOCTRINE/INFORMATION_MODEL.md (evidence -> observation -> claim -> relationship).
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE actor (
  actor_id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('human','agent','system')),
  name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- corpus_id = native node id; polymorphic edges reference nodes by this id, UNIQUE per table.
CREATE TABLE entity (
  entity_id UUID PRIMARY KEY,
  corpus_id TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('vendor','program','product','person','region','deal_condition','customer_segment')),
  name TEXT NOT NULL,
  ref  TEXT UNIQUE,
  domain TEXT CHECK (domain IS NULL OR domain IN ('company_identity','compliance_certifications','security_posture','vendor_program_memberships','financial_signals','public_presence','supply_chain','regulatory_standing')),
  access_layer TEXT CHECK (access_layer IS NULL OR access_layer IN ('public','shared_in_session','partner_portal','authenticated_customer_portal','private_relationship_signal','internal_operator_note','restricted','compartmented','unknown')),
  output_permission TEXT CHECK (output_permission IS NULL OR output_permission IN ('public_ok','customer_safe_summary_ok','partner_only','internal_only','do_not_share','review_required')),
  extensions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE evidence (
  evidence_id UUID PRIMARY KEY,
  corpus_id TEXT UNIQUE,
  entity_id UUID NOT NULL REFERENCES entity(entity_id),
  hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  uri  TEXT NOT NULL,
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('original_source','derived_projection','operator_entry','system_sync','third_party_assertion')),
  source_url TEXT, collected_at TIMESTAMPTZ,
  access_layer TEXT CHECK (access_layer IS NULL OR access_layer IN ('public','shared_in_session','partner_portal','authenticated_customer_portal','private_relationship_signal','internal_operator_note','restricted','compartmented','unknown')),
  output_permission TEXT CHECK (output_permission IS NULL OR output_permission IN ('public_ok','customer_safe_summary_ok','partner_only','internal_only','do_not_share','review_required')),
  domain TEXT, dep_level TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE observation (
  observation_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES actor(actor_id),
  entity_id UUID NOT NULL REFERENCES entity(entity_id),
  evidence_id UUID NOT NULL REFERENCES evidence(evidence_id),
  type TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE claim (
  claim_id UUID PRIMARY KEY,
  corpus_id TEXT UNIQUE,
  entity_id UUID NOT NULL REFERENCES entity(entity_id),
  subject TEXT, statement TEXT NOT NULL,
  confidence TEXT CHECK (confidence IS NULL OR confidence IN ('confirmed','probable','unverified','disputed')),
  supersedes UUID REFERENCES claim(claim_id),
  superseded_by UUID REFERENCES claim(claim_id),
  valid_from TIMESTAMPTZ NOT NULL, valid_to TIMESTAMPTZ,
  extractor JSONB NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE claim_evidence (
  claim_id UUID NOT NULL REFERENCES claim(claim_id),
  evidence_id UUID NOT NULL REFERENCES evidence(evidence_id),
  PRIMARY KEY (claim_id, evidence_id));

-- relationship = POLYMORPHIC typed edge. from_id/to_id reference nodes by corpus_id (not FK);
-- from_type/to_type carry the node kind (PascalCase, v0.9 enum). ONE live edge per (from,to,kind).
CREATE TABLE relationship (
  relationship_id UUID PRIMARY KEY,
  corpus_id TEXT,
  from_id   TEXT NOT NULL,
  from_type TEXT NOT NULL CHECK (from_type IN ('Entity','Claim','Evidence','Rule','Projection','EvaluationArtifact')),
  to_id     TEXT NOT NULL,
  to_type   TEXT NOT NULL CHECK (to_type   IN ('Entity','Claim','Evidence','Rule','Projection','EvaluationArtifact')),
  kind TEXT NOT NULL CHECK (kind IN ('supports','derives_from','scoped_to','routes_when','captured_via','part_of','covers','automates','requires','substitutes','conflicts_with','supersedes')),
  weight REAL,
  statement TEXT,
  confidence TEXT CHECK (confidence IS NULL OR confidence IN ('confirmed','probable','unverified','disputed')),
  access_layer TEXT CHECK (access_layer IS NULL OR access_layer IN ('public','shared_in_session','partner_portal','authenticated_customer_portal','private_relationship_signal','internal_operator_note','restricted','compartmented','unknown')),
  output_permission TEXT CHECK (output_permission IS NULL OR output_permission IN ('public_ok','customer_safe_summary_ok','partner_only','internal_only','do_not_share','review_required')),
  supersedes UUID REFERENCES relationship(relationship_id),
  superseded_by UUID REFERENCES relationship(relationship_id),
  valid_from TIMESTAMPTZ NOT NULL, valid_to TIMESTAMPTZ,
  extractor JSONB NOT NULL, extensions JSONB, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE relationship_evidence (
  relationship_id UUID NOT NULL REFERENCES relationship(relationship_id),
  evidence_id UUID NOT NULL REFERENCES evidence(evidence_id),
  PRIMARY KEY (relationship_id, evidence_id));

CREATE INDEX claim_live_idx     ON claim (entity_id, subject) WHERE superseded_by IS NULL;
CREATE INDEX rel_live_from_idx  ON relationship (from_id) WHERE superseded_by IS NULL;
CREATE INDEX rel_live_to_idx    ON relationship (to_id)   WHERE superseded_by IS NULL;
CREATE UNIQUE INDEX rel_one_live_per_triple
  ON relationship (from_id, to_id, kind) WHERE superseded_by IS NULL;

-- INVARIANT #1: evidence immutable.
CREATE OR REPLACE FUNCTION reject_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'append-only: % on % is forbidden', TG_OP, TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER evidence_immutable BEFORE UPDATE OR DELETE ON evidence FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- INVARIANT #5: claim append-only — only superseded_by/valid_to (NULL->value) may change.
CREATE OR REPLACE FUNCTION claim_update_guard() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW.claim_id,NEW.corpus_id,NEW.entity_id,NEW.subject,NEW.statement,NEW.confidence,NEW.supersedes,NEW.valid_from,NEW.extractor,NEW.recorded_at)
       IS NOT DISTINCT FROM
     ROW(OLD.claim_id,OLD.corpus_id,OLD.entity_id,OLD.subject,OLD.statement,OLD.confidence,OLD.supersedes,OLD.valid_from,OLD.extractor,OLD.recorded_at)
     AND (NEW.superseded_by IS NOT DISTINCT FROM OLD.superseded_by
          OR (OLD.superseded_by IS NULL AND NEW.superseded_by IS NOT NULL))
     AND (NEW.valid_to IS NOT DISTINCT FROM OLD.valid_to
          OR (OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'claim is append-only: only superseded_by/valid_to (NULL->value) may change';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER claim_update_only_legal BEFORE UPDATE ON claim FOR EACH ROW EXECUTE FUNCTION claim_update_guard();
CREATE TRIGGER claim_no_delete BEFORE DELETE ON claim FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- INVARIANT #5: relationship append-only.
CREATE OR REPLACE FUNCTION relationship_update_guard() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW.relationship_id,NEW.corpus_id,NEW.from_id,NEW.from_type,NEW.to_id,NEW.to_type,NEW.kind,NEW.weight,NEW.statement,NEW.confidence,NEW.access_layer,NEW.output_permission,NEW.supersedes,NEW.valid_from,NEW.extractor,NEW.extensions,NEW.recorded_at)
       IS NOT DISTINCT FROM
     ROW(OLD.relationship_id,OLD.corpus_id,OLD.from_id,OLD.from_type,OLD.to_id,OLD.to_type,OLD.kind,OLD.weight,OLD.statement,OLD.confidence,OLD.access_layer,OLD.output_permission,OLD.supersedes,OLD.valid_from,OLD.extractor,OLD.extensions,OLD.recorded_at)
     AND (NEW.superseded_by IS NOT DISTINCT FROM OLD.superseded_by
          OR (OLD.superseded_by IS NULL AND NEW.superseded_by IS NOT NULL))
     AND (NEW.valid_to IS NOT DISTINCT FROM OLD.valid_to
          OR (OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'relationship is append-only: only superseded_by/valid_to (NULL->value) may change';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER relationship_update_only_legal BEFORE UPDATE ON relationship FOR EACH ROW EXECUTE FUNCTION relationship_update_guard();
CREATE TRIGGER relationship_no_delete BEFORE DELETE ON relationship FOR EACH ROW EXECUTE FUNCTION reject_mutation();
COMMIT;
