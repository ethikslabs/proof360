// Applies the proof360 memory migrations (vendored CORPUS engine + atom extension) to the memory
// database. Mirrors scripts/run-migrations.js but targets the memory pool + db/memory-migrations.
// Idempotent: tracks applied ids in schema_migrations. Used by `npm run migrate:memory` and the
// test harness (tests/memory/_setup.js) against proof360_memory_test.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/memory/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'db', 'memory-migrations');

const MIGRATIONS = [
  { id: '001_engine', file: join(dir, '001_engine.sql') },
  { id: '002_proof360_atom', file: join(dir, '002_proof360_atom.sql') },
  { id: '003_journey', file: join(dir, '003_journey.sql') },
];

export async function runMemoryMigrations(targetPool = pool) {
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  for (const m of MIGRATIONS) {
    const existing = await targetPool.query('SELECT id FROM schema_migrations WHERE id = $1', [m.id]);
    if (existing.rows.length > 0) { console.log(`migration ${m.id} already applied`); continue; }
    const sql = await readFile(m.file, 'utf8');
    console.log(`applying migration ${m.id}`);
    await targetPool.query(sql);
    await targetPool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
    console.log(`migration ${m.id} applied`);
  }
}

// Run directly (node scripts/run-memory-migrations.js) — not when imported by the test harness.
if (import.meta.url === `file://${process.argv[1]}`) {
  runMemoryMigrations()
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(async () => { await pool.end(); });
}
