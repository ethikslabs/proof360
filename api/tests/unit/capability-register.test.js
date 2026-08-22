import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseTrigger } from '../../src/services/trigger-evaluator.js';

// The compiled register artifact (scripts/compile-register.mjs). The CSV in
// _working/ stays the authored SSOT; this JSON is its build-time projection.
const REGISTER_PATH = fileURLToPath(
  new URL('../../src/config/capability-register.json', import.meta.url));

describe('capability-register.json — compiled artifact', () => {
  it('holds the full 70-row register, each entry routable and parseable', async () => {
    const register = JSON.parse(await readFile(REGISTER_PATH, 'utf8'));
    expect(register.entries).toHaveLength(70);
    for (const entry of register.entries) {
      expect(entry.id).toBeTruthy();
      expect(entry.trigger).toBeTruthy();
      expect(entry.cer_route).toBeTruthy();
      // every compiled trigger must parse into a firing-capable kind — an unparsed
      // trigger in the artifact is dead weight that silently never fires
      expect(parseTrigger(entry.trigger).kind).not.toBe('unparsed');
    }
  });

  it('routes the acceptance-walk entries to their CER pathways', async () => {
    const { entries } = JSON.parse(await readFile(REGISTER_PATH, 'utf8'));
    const activate = entries.find((e) => e.id === 'aws-activate-founders');
    expect(activate.cer_route).toBe('ingram_micro_aws');
    expect(activate.trigger).toContain('has_raised_institutional');
    const vanta = entries.find((e) => e.id === 'cap-vanta');
    expect(vanta.cer_route).toBe('vanta');
  });
});
