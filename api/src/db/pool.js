// Single Postgres pool — credentials from SSM /proof360/postgres/*
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'proof360',
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
});

export default pool;
export const query = (text, params) => pool.query(text, params);
