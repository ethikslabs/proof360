// signal-store.js — Override stack management, conflict detection
// Enforces: system never beats human, append-only signal_events,
// cross-actor conflict → status='conflicted'
import pool, { query } from '../db/pool.js';

/**
 * Determine if an actor is human (not system).
 * Human actors: founder, partner:<tenant_id>, mcp:<agent_id>
 * System actors: system (rescans)
 */
function isHumanActor(actor) {
  return actor !== 'system';
}

/**
 * Apply an override to a signal field.
 * @param {string} sessionId
 * @param {{ field: string, value: string, actor: string, reason: string }} override
 * @returns {Promise<{ signal: object, event: object, conflicted: boolean }>}
 */
export async function applyOverride(sessionId, { field, value, actor, reason }) {
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // 1. Load or create the signal row for (sessionId, field)
    let signalRes = await conn.query(
      'SELECT * FROM signals WHERE session_id = $1 AND field = $2 FOR UPDATE',
      [sessionId, field]
    );

    let signal;
    if (signalRes.rows.length === 0) {
      // Create new signal row
      const insertRes = await conn.query(
        `INSERT INTO signals (session_id, field, current_value, current_actor, status)
         VALUES ($1, $2, $3, $4, 'overridden')
         RETURNING *`,
        [sessionId, field, value, actor]
      );
      signal = insertRes.rows[0];
    } else {
      signal = signalRes.rows[0];
    }

    const priorValue = signal.current_value;
    const human = isHumanActor(actor);
    let conflicted = false;

    if (signalRes.rows.length > 0) {
      // Existing signal — apply override rules
      const hasHumanOverride = signal.current_actor && isHumanActor(signal.current_actor);

      if (!human && hasHumanOverride) {
        // System override with existing human override → no change to current_value
        // Still append the event for audit trail
        const eventRes = await conn.query(
          `INSERT INTO signal_events (signal_id, event_type, actor, reason, prior_value, new_value)
           VALUES ($1, 'rescanned', $2, $3, $4, $5)
           RETURNING *`,
          [signal.id, actor, reason, priorValue, value]
        );

        await conn.query('COMMIT');
        return { signal, event: eventRes.rows[0], conflicted: false };
      }

      if (human && hasHumanOverride && signal.current_actor !== actor && signal.current_value !== value) {
        // Cross-actor conflict: different human actor, different value.
        // Still update current_value to the challenger's value so recompute
        // runs against the latest human input while surfacing conflict status.
        conflicted = true;
        const updateRes = await conn.query(
          `UPDATE signals SET current_value = $1, current_actor = $2, status = 'conflicted'
           WHERE id = $3 RETURNING *`,
          [value, actor, signal.id]
        );
        signal = updateRes.rows[0];
      } else if (human) {
        // Human override — update current_value
        const updateRes = await conn.query(
          `UPDATE signals SET current_value = $1, current_actor = $2, status = 'overridden'
           WHERE id = $3 RETURNING *`,
          [value, actor, signal.id]
        );
        signal = updateRes.rows[0];
      } else {
        // System override, no prior human override — update current_value
        const updateRes = await conn.query(
          `UPDATE signals SET current_value = $1, current_actor = $2, status = 'overridden'
           WHERE id = $3 RETURNING *`,
          [value, actor, signal.id]
        );
        signal = updateRes.rows[0];
      }
    }

    // Always append signal_events row
    const eventRes = await conn.query(
      `INSERT INTO signal_events (signal_id, event_type, actor, reason, prior_value, new_value)
       VALUES ($1, 'overridden', $2, $3, $4, $5)
       RETURNING *`,
      [signal.id, actor, reason, priorValue, value]
    );

    await conn.query('COMMIT');
    return { signal, event: eventRes.rows[0], conflicted };
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Resolve a conflicted signal.
 * @param {string} sessionId
 * @param {{ field: string, chosen_value: string, actor: string, reason: string }} resolution
 * @returns {Promise<{ signal: object, event: object }>}
 */
export async function resolveConflict(sessionId, { field, chosen_value, actor, reason }) {
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Load the signal — must be in 'conflicted' status
    const signalRes = await conn.query(
      'SELECT * FROM signals WHERE session_id = $1 AND field = $2 FOR UPDATE',
      [sessionId, field]
    );

    if (signalRes.rows.length === 0) {
      throw new Error('Signal not found');
    }

    const signal = signalRes.rows[0];

    if (signal.status !== 'conflicted') {
      const err = new Error('Signal is not in conflicted status');
      err.code = 'NOT_CONFLICTED';
      throw err;
    }

    // Query the two most recent signal_events to find both competing values
    const competingRes = await conn.query(
      `SELECT actor, new_value FROM signal_events
       WHERE signal_id = $1
       ORDER BY ts DESC
       LIMIT 2`,
      [signal.id]
    );

    // Build structured reason preserving both prior values for audit replay
    const resolvedFrom = {};
    for (const row of competingRes.rows) {
      resolvedFrom[row.actor] = row.new_value;
    }

    const structuredReason = JSON.stringify({
      resolved_from: resolvedFrom,
      chosen: chosen_value,
      reason: reason || null,
    });

    const priorValue = signal.current_value;

    // Update to resolved state
    const updateRes = await conn.query(
      `UPDATE signals SET current_value = $1, current_actor = $2, status = 'overridden'
       WHERE id = $3 RETURNING *`,
      [chosen_value, actor, signal.id]
    );

    // Append conflict_resolved event with structured reason containing both prior values
    const eventRes = await conn.query(
      `INSERT INTO signal_events (signal_id, event_type, actor, reason, prior_value, new_value)
       VALUES ($1, 'conflict_resolved', $2, $3, $4, $5)
       RETURNING *`,
      [signal.id, actor, structuredReason, priorValue, chosen_value]
    );

    await conn.query('COMMIT');
    return { signal: updateRes.rows[0], event: eventRes.rows[0] };
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Load all signals for a session with current_value materialised.
 * @param {string} sessionId
 * @returns {Promise<object[]>}
 */
export async function loadSignals(sessionId) {
  const result = await query(
    'SELECT * FROM signals WHERE session_id = $1',
    [sessionId]
  );
  return result.rows;
}
