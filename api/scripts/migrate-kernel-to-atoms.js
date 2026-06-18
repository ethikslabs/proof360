// One-shot migration: read the file-backed founder-memory kernel (v1) and replay each profile's
// reconstructed claims into atoms in the memory DB (v2). Idempotent-ish: re-running creates fresh
// company nodes, so run once against a clean memory DB. Logic is migrateProfile() (tested); this
// is just the file walker for EC2. MEMORY_STORE_DIR defaults to the kernel's production path.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import pool from '../src/memory/db.js';
import { migrateProfile } from '../src/memory/migrate.js';

const ROOT = process.env.MEMORY_STORE_DIR || join(homedir(), '.ethikslabs', 'proof360', 'memory');

async function readJson(path) { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; } }
async function listDirs(path) { try { return (await readdir(path, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; } }

async function main() {
  const foundersDir = join(ROOT, 'founders');
  const hashes = await listDirs(foundersDir);
  let migrated = 0;
  for (const hash of hashes) {
    const founder = await readJson(join(foundersDir, hash, 'founder.json'));
    const profilesDir = join(foundersDir, hash, 'profiles');
    for (const profileId of await listDirs(profilesDir)) {
      const snapshot = await readJson(join(profilesDir, profileId, 'snapshots', 'current.json'));
      if (!snapshot?.current_claims) { console.warn(`skip ${hash}/${profileId}: no snapshot`); continue; }
      const founderName = founder?.name || founder?.email || `founder-${hash.slice(0, 8)}`;
      const companyName = snapshot.current_claims.company_name?.value || `company-${profileId.slice(0, 8)}`;
      const { company } = await migrateProfile(snapshot, { founderName, companyName });
      migrated += 1;
      console.log(`migrated ${hash}/${profileId} -> company ${company.entity_id} (${Object.keys(snapshot.current_claims).length} claims)`);
    }
  }
  console.log(`done: ${migrated} profile(s) migrated from ${ROOT}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
