import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  {
    id: '001_v3_schema',
    file: join(__dirname, '..', 'db', 'migrations', '001_v3_schema.sql'),
  },
];

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const migration of MIGRATIONS) {
    const existing = await pool.query('SELECT id FROM schema_migrations WHERE id = $1', [migration.id]);
    if (existing.rows.length > 0) {
      console.log(`migration ${migration.id} already applied`);
      continue;
    }

    const sql = await readFile(migration.file, 'utf8');
    console.log(`applying migration ${migration.id}`);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
    console.log(`migration ${migration.id} applied`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
