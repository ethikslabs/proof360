// Vitest globalSetup — runs ONCE before any test worker. Resets the memory test DB and applies
// migrations a single time, so parallel test files never race on DROP SCHEMA / CREATE EXTENSION.
// Workers (see _setup.js) only read/insert unique rows; they do not reset. Skips silently if no
// Postgres is reachable so non-DB environments still run the rest of the suite.
import os from 'node:os';

export async function setup() {
  process.env.PG_MEMORY_HOST ||= '/tmp';
  process.env.PG_MEMORY_USER ||= os.userInfo().username;
  process.env.PG_MEMORY_DATABASE = process.env.PG_MEMORY_TEST_DATABASE || 'proof360_memory_test';

  const { default: pool } = await import('../../src/memory/db.js');
  const { runMemoryMigrations } = await import('../../scripts/run-memory-migrations.js');
  try {
    await pool.query('SELECT 1');
  } catch {
    console.warn('[memory globalSetup] Postgres not reachable — memory tests will skip');
    await pool.end();
    return;
  }
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMemoryMigrations(pool);
  await pool.end();
}
