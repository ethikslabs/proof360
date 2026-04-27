// Engagement router — three-branch routing logic
// john → internal handling, John commission attribution
// distributor → match tenants.partner_branch='distributor', priority NULLS LAST, created_at
// vendor → direct attribution, no routing intermediary
//
// Inserts: engagements row (status='created'), engagement_events row (event_type='routed'),
//          attribution_ledger rows (expected_amount, expected_date per known party)

import { query } from '../db/pool.js';
import { send as signumSend } from './signum-stub.js';

/**
 * Route an engagement for a given session + vendor + branch selection.
 *
 * @param {string} sessionId - UUID of the session
 * @param {{ vendor_id: string, selected_branch: 'john'|'distributor'|'vendor' }} options
 * @returns {Promise<{ engagement_id: string, status: string, routed_to: object|null }>}
 */
export async function routeEngagement(sessionId, { vendor_id, selected_branch }) {
  let routed_tenant_id = null;
  let routed_to = null;

  // ── Branch resolution ────────────────────────────────────────────────
  if (selected_branch === 'john') {
    // Internal handling — no tenant routing needed
    routed_to = { party: 'john', type: 'internal', name: 'Proof360 (John)' };

  } else if (selected_branch === 'distributor') {
    // Match best distributor tenant: priority NULLS LAST, then earliest created_at
    const { rows } = await query(
      `SELECT id, name FROM tenants
       WHERE partner_branch = 'distributor'
       ORDER BY priority NULLS LAST, created_at
       LIMIT 1`,
    );

    if (rows.length === 0) {
      throw new Error('No distributor tenant available for routing');
    }

    routed_tenant_id = rows[0].id;
    routed_to = { tenant_id: rows[0].id, name: rows[0].name };

  } else if (selected_branch === 'vendor') {
    // Direct attribution — no routing intermediary
    routed_to = { party: 'vendor', type: 'direct', vendor_id };

  } else {
    throw new Error(`Unknown branch: ${selected_branch}`);
  }

  // ── Insert engagements row (status='created') ────────────────────────
  const engagementResult = await query(
    `INSERT INTO engagements (session_id, selected_branch, routed_tenant_id, vendor_id, status)
     VALUES ($1, $2, $3, $4, 'created')
     RETURNING id, status, created_at`,
    [sessionId, selected_branch, routed_tenant_id, vendor_id],
  );

  const engagement = engagementResult.rows[0];
  const engagement_id = engagement.id;

  // ── Insert engagement_events row (event_type='routed') ───────────────
  await query(
    `INSERT INTO engagement_events (engagement_id, event_type, actor, metadata)
     VALUES ($1, 'routed', $2, $3)`,
    [
      engagement_id,
      'system',
      JSON.stringify({
        vendor_id,
        selected_option: selected_branch,
        resolved_destination: routed_to,
      }),
    ],
  );

  // ── Insert attribution_ledger rows ───────────────────────────────────
  await insertAttributionRows(engagement_id, selected_branch, vendor_id);

  // ── SIGNUM alert — fire-and-forget Telegram notification ─────────────
  signumSend({
    channel: 'telegram',
    to: process.env.TELEGRAM_CHAT_ID || '',
    message: `[proof360] Engagement routed: ${vendor_id} via ${selected_branch} (session ${sessionId})`,
  }).catch(err => {
    console.error(JSON.stringify({ event: 'signum_send_failed', session_id: sessionId, error: err.message }));
  });

  return { engagement_id, status: 'created', routed_to };
}

/**
 * Insert attribution_ledger rows with expected_amount and expected_date per known party.
 * Each branch type produces different attribution splits.
 */
async function insertAttributionRows(engagement_id, selected_branch, vendor_id) {
  if (selected_branch === 'john') {
    // John gets full commission attribution
    await query(
      `INSERT INTO attribution_ledger (engagement_id, party, share_percentage, expected_amount, expected_date, status)
       VALUES ($1, $2, $3, $4, $5, 'expected')`,
      [engagement_id, 'john', 100, null, null],
    );

  } else if (selected_branch === 'distributor') {
    // Distributor and John split — distributor primary, John referral
    await query(
      `INSERT INTO attribution_ledger (engagement_id, party, share_percentage, expected_amount, expected_date, status)
       VALUES ($1, $2, $3, $4, $5, 'expected')`,
      [engagement_id, 'distributor', 70, null, null],
    );
    await query(
      `INSERT INTO attribution_ledger (engagement_id, party, share_percentage, expected_amount, expected_date, status)
       VALUES ($1, $2, $3, $4, $5, 'expected')`,
      [engagement_id, 'john', 30, null, null],
    );

  } else if (selected_branch === 'vendor') {
    // Vendor direct — vendor gets attribution, John gets referral
    await query(
      `INSERT INTO attribution_ledger (engagement_id, party, share_percentage, expected_amount, expected_date, status)
       VALUES ($1, $2, $3, $4, $5, 'expected')`,
      [engagement_id, vendor_id || 'vendor', 80, null, null],
    );
    await query(
      `INSERT INTO attribution_ledger (engagement_id, party, share_percentage, expected_amount, expected_date, status)
       VALUES ($1, $2, $3, $4, $5, 'expected')`,
      [engagement_id, 'john', 20, null, null],
    );
  }
}
