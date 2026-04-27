import { getSession } from '../services/session-store.js';
import { loadSignals } from '../services/signal-store.js';
import { AWS_PROGRAMS, evaluateTrigger, KNOWN_SIGNAL_FIELDS } from '../config/aws-programs.js';
import { query } from '../db/pool.js';

/**
 * Build a human-readable eligibility reason from matched triggers.
 * @param {object} program - AWS program definition
 * @param {object} signals - Session signals_object
 * @returns {string}
 */
export function buildEligibilityReason(program, signals) {
  const parts = program.triggers.map((trigger) => {
    const val = signals[trigger.field];
    switch (trigger.op) {
      case 'eq':
        return `${trigger.field} is ${val}`;
      case 'not_eq':
        return `${trigger.field} is not ${trigger.value}`;
      case 'in':
        return `${trigger.field} is ${val}`;
      case 'exists':
        return `${trigger.field} is present`;
      default:
        return `${trigger.field} matched`;
    }
  });
  return `Eligible because ${parts.join(' and ')}.`;
}

/**
 * Compute confidence for a matched program based on signal completeness.
 * - "high": all trigger signals present and match exactly, capped by program ceiling
 * - "medium": required triggers match but some optional/contextual signals missing
 * - "low": partial match or inference required
 * @param {object} program - AWS program definition
 * @param {object} signals - Session signals_object
 * @returns {"high"|"medium"|"low"}
 */
export function computeProgramConfidence(program, signals) {
  const ceiling = program.confidence_when_matched;
  const RANK = { high: 3, medium: 2, low: 1 };

  // Check how many known signal fields have actual values in the signals object
  const populatedFields = KNOWN_SIGNAL_FIELDS.filter(
    (f) => signals[f] !== undefined && signals[f] !== null && signals[f] !== '',
  );

  // All trigger fields must be explicitly present (not undefined/null/empty)
  const allTriggerFieldsPresent = program.triggers.every((t) => {
    const v = signals[t.field];
    return v !== undefined && v !== null && v !== '';
  });

  let computed;
  if (allTriggerFieldsPresent && populatedFields.length >= KNOWN_SIGNAL_FIELDS.length * 0.7) {
    computed = 'high';
  } else if (allTriggerFieldsPresent) {
    computed = 'medium';
  } else {
    computed = 'low';
  }

  // Never exceed the program's confidence ceiling
  if (RANK[computed] > RANK[ceiling]) {
    computed = ceiling;
  }

  return computed;
}

/**
 * Evaluate all programs against signals, returning eligible ones in response shape.
 * @param {object} signals - Session signals_object
 * @param {Array} catalogue - AWS_PROGRAMS array
 * @returns {Array}
 */
export function evaluatePrograms(signals, catalogue) {
  return catalogue
    .filter((program) => program.triggers.every((t) => evaluateTrigger(t, signals)))
    .map((program) => ({
      program_id: program.program_id,
      name: program.name,
      benefit: program.benefit,
      eligibility_reason: buildEligibilityReason(program, signals),
      application_url: program.application_url,
      category: program.category,
      confidence: computeProgramConfidence(program, signals),
    }));
}

export async function programMatchHandler(request, reply) {
  const { session_id } = request.params;

  // Read signals from Postgres as canonical source
  // Build signals map from Postgres rows: { [field]: current_value }
  let signalsObj = null;

  try {
    const signalRows = await loadSignals(session_id);
    if (signalRows.length > 0) {
      signalsObj = {};
      for (const row of signalRows) {
        signalsObj[row.field] = row.current_value;
      }
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'pg_read_error', handler: 'program-match',
      session_id, error: err.message,
    }));
  }

  // Fallback: try in-memory session for active pipelines
  if (!signalsObj) {
    const session = getSession(session_id);
    if (!session) {
      // Check if session exists in Postgres at all
      try {
        const sessRes = await query('SELECT id FROM sessions WHERE id = $1', [session_id]);
        if (sessRes.rows.length === 0) {
          return reply.status(404).send({ error: 'session_not_found' });
        }
      } catch {
        // Postgres unavailable — fall through to assessment_incomplete
      }
      return reply.status(202).send({
        status: 'assessment_incomplete',
        message: 'Assessment still running',
      });
    }
    signalsObj = session.signals || session.signals_object;
  }

  if (!signalsObj) {
    return reply.status(202).send({
      status: 'assessment_incomplete',
      message: 'Assessment still running',
    });
  }

  const programs = evaluatePrograms(signalsObj, AWS_PROGRAMS);
  return reply.send({ programs });
}
