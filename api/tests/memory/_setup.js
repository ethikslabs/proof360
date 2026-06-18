// Memory test harness. Points the memory pool at proof360_memory_test BEFORE importing it,
// then exposes resetMemoryDb() to drop+rebuild the schema and re-apply migrations per suite.
// Local default is the Postgres socket as the current OS user (brew postgresql@16). CI overrides
// via PG_MEMORY_* env. Skips gracefully (SKIP=true) if no Postgres is reachable.
import os from 'node:os';

process.env.PG_MEMORY_HOST ||= '/tmp';
process.env.PG_MEMORY_USER ||= os.userInfo().username;
process.env.PG_MEMORY_DATABASE = process.env.PG_MEMORY_TEST_DATABASE || 'proof360_memory_test';

const { default: pool } = await import('../../src/memory/db.js');
const { runMemoryMigrations } = await import('../../scripts/run-memory-migrations.js');

export { pool };

export async function pgReachable() {
  try { await pool.query('SELECT 1'); return true; } catch { return false; }
}

// Evaluated at module load so suites can `describe.skipIf(!reachable)` — clean skip (not a soft
// failure) when no Postgres is provisioned, e.g. CI without a pg service.
export const reachable = await pgReachable();

export async function resetMemoryDb() {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMemoryMigrations(pool);
}
