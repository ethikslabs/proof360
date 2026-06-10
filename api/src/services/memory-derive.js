import { randomUUID } from 'node:crypto';

const EXPLICIT_FACT_FIELDS = new Set([
  'company_name',
  'website',
  'stage',
  'sector',
  'product_type',
  'customer_type',
  'data_sensitivity',
  'geo_market',
  'handles_payments',
  'handles_personal_data',
  'uses_ai',
  'has_backup',
  'pen_test_completed',
  'aws_program_enrolled',
  'microsoft_program_enrolled',
  'team_size',
  'revenue',
  'funding_stage',
  'cloud_provider',
]);

function iso() {
  return new Date().toISOString();
}

function sourceForSignal(signal) {
  if (signal?.actor === 'founder' || signal?.current_actor === 'founder') return 'founder';
  return 'cold_read';
}

function normalizeField(field) {
  return String(field || '').trim().toLowerCase();
}

function normalizeFact(fact) {
  const field = normalizeField(fact?.field || fact?.type);
  if (!field || !EXPLICIT_FACT_FIELDS.has(field)) return null;
  if (fact.value == null || fact.value === '' || fact.value === 'Unknown' || fact.value === 'unknown') return null;
  return {
    field,
    value: fact.value,
    actor: fact.actor === 'system' ? 'system' : 'founder',
    source: fact.source || (fact.actor === 'system' ? 'cold_read' : 'founder'),
    confidence: fact.confidence || 'founder_provided',
  };
}

function buildFactRecords({ profileId, fact, eventId, evidenceKind = 'founder_statement' }) {
  const evidenceId = randomUUID();
  const observationId = randomUUID();
  const claimId = randomUUID();
  const createdAt = iso();
  return [
    {
      primitive: 'evidence',
      id: evidenceId,
      profile_id: profileId,
      event_id: eventId,
      kind: evidenceKind,
      source: fact.source,
      content: {
        field: fact.field,
        value: fact.value,
        confidence: fact.confidence,
      },
      created_at: createdAt,
    },
    {
      primitive: 'observation',
      id: observationId,
      profile_id: profileId,
      field: fact.field,
      value: fact.value,
      basis: 'explicit',
      source: fact.source,
      event_ids: [eventId],
      evidence_ids: [evidenceId],
      observed_at: createdAt,
    },
    {
      primitive: 'claim',
      id: claimId,
      profile_id: profileId,
      field: fact.field,
      value: fact.value,
      actor: fact.actor,
      source: fact.source,
      state: 'believed',
      promoted_from: [observationId],
      evidence_ids: [evidenceId],
      created_at: createdAt,
    },
  ];
}

export function buildProfileEventRecords(profile, payload = {}) {
  const eventId = randomUUID();
  const source = payload.source || 'chat';
  const kind = payload.kind || 'chat';
  const event = {
    primitive: 'event',
    id: eventId,
    profile_id: profile.id,
    kind,
    source,
    content: payload.content || {
      message: payload.message || null,
      role: payload.role || 'user',
    },
    occurred_at: iso(),
  };

  const records = [event];
  for (const rawFact of payload.facts || []) {
    const fact = normalizeFact(rawFact);
    if (fact) {
      records.push(...buildFactRecords({ profileId: profile.id, fact, eventId }));
    }
  }
  return records;
}

export function buildSessionAttachRecords(profile, session) {
  const eventId = randomUUID();
  const source = 'cold_read';
  const records = [
    {
      primitive: 'event',
      id: eventId,
      profile_id: profile.id,
      kind: 'session_activity',
      source,
      content: {
        session_id: session.id,
        website_url: session.website_url || null,
        company_name: session.company_name || null,
        infer_status: session.infer_status || null,
        trust_score: session.trust_score ?? null,
        attached_at: iso(),
      },
      occurred_at: iso(),
    },
  ];

  const sessionFacts = [];
  if (session.company_name) {
    sessionFacts.push({ field: 'company_name', value: session.company_name, actor: 'system', source });
  }
  if (session.website_url) {
    sessionFacts.push({ field: 'website', value: session.website_url, actor: 'system', source });
  }
  for (const signal of session.raw_signals || []) {
    sessionFacts.push({
      field: signal.type || signal.field,
      value: signal.value ?? signal.current_value ?? signal.inferred_value,
      actor: sourceForSignal(signal) === 'founder' ? 'founder' : 'system',
      source: sourceForSignal(signal),
      confidence: signal.confidence || signal.inferred_confidence || 'observed',
    });
  }

  for (const rawFact of sessionFacts) {
    const fact = normalizeFact(rawFact);
    if (fact) {
      records.push(...buildFactRecords({
        profileId: profile.id,
        fact,
        eventId,
        evidenceKind: fact.source === 'founder' ? 'founder_statement' : 'cold_read_signal',
      }));
    }
  }

  return records;
}

export const _internals = {
  normalizeFact,
  buildFactRecords,
  EXPLICIT_FACT_FIELDS,
};
