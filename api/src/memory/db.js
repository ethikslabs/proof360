// proof360 memory pool — SEPARATE database from the main proof360 DB ("share the engine, not the
// pile"). Same host/credentials as src/db/pool.js, but a different database (default
// 'proof360_memory'). Local dev with nothing set falls through to the Postgres socket as the
// current OS user. Tests point PG_MEMORY_DATABASE at 'proof360_memory_test'.
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PG_MEMORY_HOST || process.env.PG_HOST || undefined,
  port: parseInt(process.env.PG_MEMORY_PORT || process.env.PG_PORT || '5432'),
  database: process.env.PG_MEMORY_DATABASE || 'proof360_memory',
  user: process.env.PG_MEMORY_USER || process.env.PG_USER || undefined,
  password: process.env.PG_MEMORY_PASSWORD || process.env.PG_PASSWORD || undefined,
  max: 10,
  idleTimeoutMillis: 30000,
});

export default pool;
export const query = (text, params) => pool.query(text, params);
