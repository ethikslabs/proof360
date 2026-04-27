#!/usr/bin/env node
// backfill-leads.js — Replay leads.ndjson → leads Postgres table
// Usage: node scripts/backfill-leads.js
// Reads PG_* env vars (same as api/src/db/pool.js)

import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NDJSON_PATH = resolve(__dirname, '..', 'api', 'leads.ndjson');

const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'proof360',
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 5,
  idleTimeoutMillis: 10000,
});

async function backfill() {
  // --- Pre-flight: check file exists ---
  if (!existsSync(NDJSON_PATH)) {
    console.log(`⚠  leads.ndjson not found at ${NDJSON_PATH} — nothing to backfill.`);
    await pool.end();
    return;
  }

  // --- Load valid session IDs for FK check ---
  const { rows: sessionRows } = await pool.query('SELECT id FROM sessions');
  const validSessions = new Set(sessionRows.map(r => r.id));
  console.log(`ℹ  ${validSessions.size} sessions in Postgres`);

  // --- Stream NDJSON line by line ---
  const rl = createInterface({
    input: createReadStream(NDJSON_PATH, 'utf8'),
    crlfDelay: Infinity,
  });

  let total = 0;
  let inserted = 0;
  let orphaned = 0;
  let skippedDup = 0;
  let errors = 0;

  for await (const line of rl) {
    total++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch (err) {
      errors++;
      console.error(`✗  line ${total}: JSON parse error — ${err.message}`);
      continue;
    }

    const { session_id, email, timestamp, source } = record;

    if (!session_id || !email) {
      errors++;
      console.error(`✗  line ${total}: missing session_id or email`);
      continue;
    }

    // FK integrity check — insert orphaned leads with session_id = NULL
    if (!validSessions.has(session_id)) {
      try {
        const existing = await pool.query(
          'SELECT 1 FROM leads WHERE session_id IS NULL AND email = $1 LIMIT 1',
          [email]
        );
        if (existing.rowCount > 0) {
          skippedDup++;
          continue;
        }
        await pool.query(
          `INSERT INTO leads (session_id, email, captured_at, source)
           VALUES (NULL, $1, $2, $3)`,
          [email, capturedAt, source || null]
        );
        orphaned++;
        console.log(`⚠  line ${total}: orphaned lead (session ${session_id} not in DB) — inserted with session_id=NULL`);
      } catch (err) {
        errors++;
        console.error(`✗  line ${total}: orphan INSERT error — ${err.message}`);
      }
      continue;
    }

    const capturedAt = timestamp || new Date().toISOString();

    try {
      // Dedup check: skip if this (session_id, email) already exists
      const existing = await pool.query(
        'SELECT 1 FROM leads WHERE session_id = $1 AND email = $2 LIMIT 1',
        [session_id, email]
      );
      if (existing.rowCount > 0) {
        skippedDup++;
        continue;
      }

      await pool.query(
        `INSERT INTO leads (session_id, email, captured_at, source)
         VALUES ($1, $2, $3, $4)`,
        [session_id, email, capturedAt, source || null]
      );
      inserted++;
    } catch (err) {
      errors++;
      console.error(`✗  line ${total}: INSERT error — ${err.message}`);
    }
  }

  // --- Report ---
  console.log('\n── Backfill complete ──');
  console.log(`  Total lines:    ${total}`);
  console.log(`  Inserted:       ${inserted}`);
  console.log(`  Orphaned:       ${orphaned}`);
  console.log(`  Skipped (dup):  ${skippedDup}`);
  console.log(`  Errors:         ${errors}`);

  await pool.end();
}

backfill().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
