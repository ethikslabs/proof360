// proof360.au/live — attestation sandbox.
// Runs the REAL vendored VERITAS + Guard code against ephemeral, per-session state.
// Nothing here writes to canonical VERITAS, Guard, or CORPUS. Sessions GC on TTL.

import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

import { AttestationService } from './vendor/veritas/service/index.js';
import { checkForLeaks } from './vendor/veritas/leak-gradient/index.js';

const require = createRequire(import.meta.url);
const { createAuditLog, readRecords, hashRecord } = require('./vendor/guard-audit-log.cjs');

const __dir = dirname(fileURLToPath(import.meta.url));
const CLAIM = JSON.parse(readFileSync(join(__dir, 'fixtures', 'corpus-claim.json'), 'utf8'));

const TTL_MS = 30 * 60 * 1000; // 30 min
const MAX_CLAIM_LEN = 280;
const sessions = new Map(); // sid -> { ledgerPath, tmpRoot, receipt, createdAt }

function gc() {
  const now = Date.now();
  for (const [sid, s] of sessions) {
    if (now - s.createdAt > TTL_MS) { try { rmSync(s.tmpRoot, { recursive: true, force: true }); } catch {} sessions.delete(sid); }
  }
}
setInterval(gc, 60_000).unref?.();

// In-memory ReceiptStore (the shipping interface).
function newStore() {
  const m = new Map();
  return {
    findBySource(s) { return [...m.values()].filter((r) => r.witnessed_by.some((x) => x.source_id === s)); },
    findById(id) { return m.get(id) ?? null; },
    findByClaim(c) { return [...m.values()].filter((r) => r.claim === c); },
    save(r) { m.set(r.receipt_id, r); },
  };
}

function corpusProvider() {
  return {
    async retrieveEvidence() { return CLAIM.supported_by.map((id) => ({ evidence_id: id })); },
    async getSourceState(source_id) { return { source_id, state: 'current', last_checked: new Date().toISOString() }; },
  };
}

function freshLedger() {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'p360-live-'));
  const ledgerPath = join(tmpRoot, 'guard-audit.jsonl');
  return { tmpRoot, ledgerPath, audit: createAuditLog(ledgerPath) };
}

// HOP 1-4: mint a real attested receipt over the sample CORPUS claim.
export async function mint(sid) {
  gc();
  const { tmpRoot, ledgerPath, audit } = freshLedger();
  audit.append({ type: 'corpus.claim.read', claim_id: CLAIM.id, text: CLAIM.text, supported_by: CLAIM.supported_by });

  const source_refs = CLAIM.supported_by.map((evId) => ({ source_id: evId, display_label: `CORPUS evidence ${evId}`, source_state: 'current' }));
  const proof_path = { proof_path_id: `pp-corpus-${CLAIM.id}`, attested_at: new Date().toISOString() };

  const service = new AttestationService(newStore(), corpusProvider());
  const { receipt } = await service.attest({
    claim: CLAIM.text, proof_path, source_refs,
    payload: { corpus_claim_id: CLAIM.id, entity_ref: CLAIM.entity_ref, access_layer: CLAIM.access_layer, confidence: CLAIM.confidence },
  });
  audit.append({ type: 'veritas.attested', receipt_id: receipt.receipt_id, state: receipt.state, receipt_hash: receipt.receipt_hash });
  audit.append({ type: 'receipt.write', outcome: 'committed' });

  sessions.set(sid, { tmpRoot, ledgerPath, receipt, createdAt: Date.now() });
  return {
    claim: { id: CLAIM.id, text: CLAIM.text, supported_by: CLAIM.supported_by, sample: true },
    receipt,
    chain_verified: audit.verifyChain(),
    ledger: audit.read(),
    note: 'Real VERITAS + Guard, ephemeral sandbox. CORPUS→VERITAS join is hand-wired (VERITAS-CORPUS-001).',
  };
}

// Tamper test: mutate one ledger record and show the hash-chain detect it.
export function tamper(sid) {
  const s = sessions.get(sid);
  if (!s) return { error: 'no_session', message: 'Mint a receipt first.' };
  const records = readRecords(s.ledgerPath);
  const verifyChain = (recs) => {
    let prev = null;
    for (const r of recs) { if (r.previous_hash !== prev || hashRecord(r) !== r.hash) return { ok: false, breaks_at: r.sequence }; prev = r.hash; }
    return { ok: true, breaks_at: null };
  };
  const before = verifyChain(records);
  // tamper: flip the receipt_hash recorded in the attested event
  const target = records.find((r) => r.event?.type === 'veritas.attested') || records[Math.min(2, records.length - 1)];
  const original = JSON.parse(JSON.stringify(target.event));
  if (target.event.receipt_hash) target.event.receipt_hash = 'deadbeef'.padEnd(64, '0');
  else target.event.tampered = true;
  const after = verifyChain(records);
  return {
    before: { chain_verified: before.ok },
    after: { chain_verified: after.ok, breaks_at: after.breaks_at },
    tampered_sequence: target.sequence,
    what_changed: { field: target.event.receipt_hash ? 'receipt_hash' : 'event', from: original.receipt_hash || '(payload)', to: target.event.receipt_hash || '(mutated)' },
    note: 'One byte changed → the sha256 hash chain no longer verifies. Tamper-evident, not asserted.',
  };
}

// Attest an arbitrary visitor-supplied claim — honestly. No evidence ⇒ Unknown.
export async function attest(claimText) {
  const text = String(claimText || '').trim().slice(0, MAX_CLAIM_LEN);
  if (!text) return { error: 'empty', message: 'Give me a claim to attest.' };
  const leaks = checkForLeaks(text);
  if (leaks.length > 0) return { error: 'leak_gradient', message: 'That input tripped the leak gradient — refused, not attested.', terms: leaks.map((l) => l.term) };

  // No proof path + no source refs (no CORPUS evidence for arbitrary text) ⇒ state "Unknown".
  const service = new AttestationService(newStore());
  const { receipt } = await service.attest({ claim: text, payload: { source: 'visitor_input' } });
  return {
    claim: text,
    receipt,
    explanation: receipt.state === 'Unknown'
      ? "No proof path, no witnessed evidence → state Unknown. The system will not rubber-stamp an unbacked claim. THAT is the trust property."
      : `State ${receipt.state}.`,
  };
}

// Curated, honest LIVE/SPEC two-axis ledger. No fragile live probes on the call path.
export function status() {
  return {
    generated_at: new Date().toISOString(),
    legend: { LIVE: 'running, artifact-backed', SPEC: 'designed, not emitting', LEVERAGE: 'composed vendor primitive', DIFFERENTIATED: 'ours' },
    components: [
      { name: 'AWS compute (EC2)', state: 'LIVE', axis: 'LEVERAGE' },
      { name: 'Identity (Auth0/Okta)', state: 'LIVE', axis: 'LEVERAGE' },
      { name: 'Foundation models (Bedrock)', state: 'LIVE', axis: 'LEVERAGE' },
      { name: 'Guard / IMPERIUM', state: 'LIVE', axis: 'DIFFERENTIATED' },
      { name: 'VERITAS attestation', state: 'LIVE', axis: 'DIFFERENTIATED' },
      { name: 'proof360 render (this page)', state: 'LIVE', axis: 'DIFFERENTIATED' },
      { name: 'CORPUS→VERITAS join', state: 'SPEC', axis: 'DIFFERENTIATED', ticket: 'VERITAS-CORPUS-001' },
      { name: 'CORPUS structured graph', state: 'SPEC', axis: 'DIFFERENTIATED' },
    ],
    honesty: 'The differentiated spine is LIVE. The automated CORPUS→VERITAS join is SPEC — the gap is wiring, not capability.',
  };
}
