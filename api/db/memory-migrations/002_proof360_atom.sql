-- proof360 ATOM extension on the vendored CORPUS engine.
-- This is the deliberate, documented divergence of proof360's buyer-memory instance from the
-- base CORPUS engine. Record against CIM-CONFORMANCE-AUDIT-001:
--   1. claim gains `authority` (the atom's defining provenance: who asserts) + access_layer +
--      output_permission (CORPUS's claim lacks access columns; invariant #3 = provenance and
--      permission are inseparable, so the buyer-memory claim must carry its own access ceiling).
--   2. entity.type widened to the buyer-memory entity kinds (person already present; +company,
--      +capability, +partner/lawyer/investor for the "add anyone with permissions" trajectory).
--   3. relationship.kind widened with membership/advisory/founding/routing edge kinds.
--   4. NEW projection primitive (canonical, not yet built in the CORPUS engine) to persist
--      posture snapshots + recommendations append-only, with input_claim_ids for walk-back.
BEGIN;

-- (2) widen entity kinds
ALTER TABLE entity DROP CONSTRAINT IF EXISTS entity_type_check;
ALTER TABLE entity ADD CONSTRAINT entity_type_check CHECK (type IN (
  'vendor','program','product','person','region','deal_condition','customer_segment',
  'company','capability','partner','lawyer','investor'));

-- (3) widen edge kinds
ALTER TABLE relationship DROP CONSTRAINT IF EXISTS relationship_kind_check;
ALTER TABLE relationship ADD CONSTRAINT relationship_kind_check CHECK (kind IN (
  'supports','derives_from','scoped_to','routes_when','captured_via','part_of','covers',
  'automates','requires','substitutes','conflicts_with','supersedes',
  'member_of','founded','advises','counsel_for','invested_in'));

-- (1) the atom: authority + access columns on claim
ALTER TABLE claim ADD COLUMN authority TEXT CHECK (authority IS NULL OR authority IN
  ('founder','cto','legal','provider','reality','system','operator'));
ALTER TABLE claim ADD COLUMN access_layer TEXT CHECK (access_layer IS NULL OR access_layer IN
  ('public','shared_in_session','partner_portal','authenticated_customer_portal',
   'private_relationship_signal','internal_operator_note','restricted','compartmented','unknown'));
ALTER TABLE claim ADD COLUMN output_permission TEXT CHECK (output_permission IS NULL OR output_permission IN
  ('public_ok','customer_safe_summary_ok','partner_only','internal_only','do_not_share','review_required'));

-- Re-lock the append-only guard to include the three new immutable columns. Only superseded_by
-- and valid_to remain NULL->value mutable (engine semantics); authority/access are write-once.
CREATE OR REPLACE FUNCTION claim_update_guard() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW.claim_id,NEW.corpus_id,NEW.entity_id,NEW.subject,NEW.statement,NEW.confidence,NEW.supersedes,NEW.valid_from,NEW.extractor,NEW.recorded_at,NEW.authority,NEW.access_layer,NEW.output_permission)
       IS NOT DISTINCT FROM
     ROW(OLD.claim_id,OLD.corpus_id,OLD.entity_id,OLD.subject,OLD.statement,OLD.confidence,OLD.supersedes,OLD.valid_from,OLD.extractor,OLD.recorded_at,OLD.authority,OLD.access_layer,OLD.output_permission)
     AND (NEW.superseded_by IS NOT DISTINCT FROM OLD.superseded_by
          OR (OLD.superseded_by IS NULL AND NEW.superseded_by IS NOT NULL))
     AND (NEW.valid_to IS NOT DISTINCT FROM OLD.valid_to
          OR (OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'claim is append-only: only superseded_by/valid_to (NULL->value) may change';
END; $$ LANGUAGE plpgsql;

-- (4) projection primitive — posture snapshots and recommendations. Append-only like claim.
-- corpus_id is the polymorphic node id edges reference (relationship.from_id/to_id, to_type='Projection').
-- extensions carries the walk-back manifest: { input_claim_ids:[...], permission_policy, capability,
-- confidence, fields } so trajectory is later a pure function over retained snapshots.
CREATE TABLE projection (
  projection_id UUID PRIMARY KEY,
  corpus_id TEXT UNIQUE,
  entity_id UUID NOT NULL REFERENCES entity(entity_id),
  kind TEXT NOT NULL CHECK (kind IN ('posture','recommendation')),
  statement TEXT,
  confidence TEXT CHECK (confidence IS NULL OR confidence IN ('confirmed','probable','unverified','disputed')),
  output_permission TEXT CHECK (output_permission IS NULL OR output_permission IN
    ('public_ok','customer_safe_summary_ok','partner_only','internal_only','do_not_share','review_required')),
  supersedes UUID REFERENCES projection(projection_id),
  superseded_by UUID REFERENCES projection(projection_id),
  valid_from TIMESTAMPTZ NOT NULL, valid_to TIMESTAMPTZ,
  extensions JSONB NOT NULL, extractor JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX projection_live_idx ON projection (entity_id, kind) WHERE superseded_by IS NULL;

CREATE OR REPLACE FUNCTION projection_update_guard() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW.projection_id,NEW.corpus_id,NEW.entity_id,NEW.kind,NEW.statement,NEW.confidence,NEW.output_permission,NEW.supersedes,NEW.valid_from,NEW.extensions,NEW.extractor,NEW.recorded_at)
       IS NOT DISTINCT FROM
     ROW(OLD.projection_id,OLD.corpus_id,OLD.entity_id,OLD.kind,OLD.statement,OLD.confidence,OLD.output_permission,OLD.supersedes,OLD.valid_from,OLD.extensions,OLD.extractor,OLD.recorded_at)
     AND (NEW.superseded_by IS NOT DISTINCT FROM OLD.superseded_by
          OR (OLD.superseded_by IS NULL AND NEW.superseded_by IS NOT NULL))
     AND (NEW.valid_to IS NOT DISTINCT FROM OLD.valid_to
          OR (OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'projection is append-only: only superseded_by/valid_to (NULL->value) may change';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER projection_update_only_legal BEFORE UPDATE ON projection FOR EACH ROW EXECUTE FUNCTION projection_update_guard();
CREATE TRIGGER projection_no_delete BEFORE DELETE ON projection FOR EACH ROW EXECUTE FUNCTION reject_mutation();
COMMIT;
