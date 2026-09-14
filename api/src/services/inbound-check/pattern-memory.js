// Pattern memory: every checked sender, one JSONL row, shaped as a CORPUS observation
// so it survives the move when CORPUS owns it (brief Q1). Nothing from the founder's
// inbox is stored beyond the sender fingerprint and when it was checked.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { memoryStoreRoot } from '../memory-store-file.js';

export function memoryFile(dir) {
  return join(dir || process.env.INBOUND_MEMORY_DIR || join(memoryStoreRoot, 'inbound'), 'senders.jsonl');
}

async function readAll(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return raw.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function priorSenders(dir, signature, { excludeAddress } = {}) {
  const rows = await readAll(memoryFile(dir));
  const seen = new Map();
  for (const r of rows) {
    if (r.kind !== 'sender_fingerprint' || r.template_signature !== signature) continue;
    if (excludeAddress && r.address === excludeAddress) continue;
    if (!seen.has(r.address)) seen.set(r.address, r.checked_at);
  }
  return [...seen].map(([address, checked_at]) => ({ address, checked_at }));
}

export async function recordSender(dir, { address, local, domain, template_signature, esp, checked_at }) {
  const file = memoryFile(dir);
  await fs.mkdir(join(file, '..'), { recursive: true });
  const row = {
    primitive: 'observation',
    kind: 'sender_fingerprint',
    address, local, domain, template_signature, esp: esp || null, checked_at,
    provenance: { method: 'inbound-check', version: 'v1', surface: 'email headers' },
  };
  await fs.appendFile(file, JSON.stringify(row) + '\n');
  return row;
}
