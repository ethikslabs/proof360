// Who may use the mailbox door: a founder with a proof360 record (they signed in and did a
// read). Anyone else is pointed at proof360 to start one. Default-deny: no record, no check.
// The founder store is the file store's founders/<hash>/founder.json; the email on it is the
// one Auth0 verified. Read-only here; nothing is created.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { memoryStoreRoot } from '../memory-store-file.js';

export async function isRegisteredEmail(email, { root = memoryStoreRoot } = {}) {
  const wanted = String(email || '').trim().toLowerCase();
  if (!wanted) return false;
  const foundersRoot = join(root, 'founders');
  let dirs;
  try { dirs = await fs.readdir(foundersRoot); } catch { return false; }
  for (const d of dirs) {
    try {
      const f = JSON.parse(await fs.readFile(join(foundersRoot, d, 'founder.json'), 'utf8'));
      if (String(f.email || '').toLowerCase() === wanted) return true;
    } catch { /* not a founder dir */ }
  }
  return false;
}

export const fileRegistry = { isRegistered: (email) => isRegisteredEmail(email) };
