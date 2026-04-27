import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const CONSUMPTION_FILE = join(DATA_DIR, 'consumption.ndjson');

// Ensure data directory exists on module load
try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch {
  // swallow — if we can't create the dir, writes will fail silently below
}

/**
 * Valid source identifiers for consumption records.
 */
const VALID_SOURCES = new Set([
  'firecrawl', 'hibp', 'abuseipdb', 'github', 'ssllabs',
  'crtsh', 'ipapi', 'portscan', 'jobs', 'dns', 'http',
  'certs', 'ip', 'ports',
]);

/**
 * Record a non-VECTOR external API call to consumption.ndjson.
 * Fire-and-forget — write failures are swallowed.
 *
 * @param {{ session_id: string, source: string, units: number, unit_type: string, success: boolean, error?: string }} params
 */
export function record({ session_id, source, units, unit_type, success, error = null }) {
  try {
    const line = JSON.stringify({
      session_id,
      source,
      units,
      unit_type,
      success,
      error,
      timestamp: new Date().toISOString(),
    });
    appendFileSync(CONSUMPTION_FILE, line + '\n');
  } catch {
    // Fire-and-forget — consumption logging must never affect the request pipeline
  }
}
