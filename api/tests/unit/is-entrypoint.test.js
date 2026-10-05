import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'node:url';
import { isEntrypoint } from '../../src/lib/is-entrypoint.js';

// Regression for the 2026-10-05 prod outage: N1 moved app.listen behind an entrypoint
// guard, and the guard was false under pm2 fork mode, so the API booted online-but-dead.
// The server must call start() for `node src/server.js`, for `npm start`, AND under pm2
// (which sets process.env.pm_exec_path while argv[1] points at the pm2 container) — but
// NOT when a test runner imports the module.
describe('isEntrypoint', () => {
  const SERVER = '/home/ec2-user/proof360/api/src/server.js';
  const SELF = pathToFileURL(SERVER).href;

  it('true for node run directly: argv[1] IS this module', () => {
    expect(isEntrypoint(SELF, {}, ['node', SERVER])).toBe(true);
  });

  it('true under pm2 fork: argv[1] is the pm2 container, pm_exec_path is the real script', () => {
    const env = { pm_exec_path: SERVER };
    const argv = ['node', '/usr/lib/node_modules/pm2/lib/ProcessContainerFork.js'];
    expect(isEntrypoint(SELF, env, argv)).toBe(true);
  });

  it('false when a test runner imports it: neither argv[1] nor pm_exec_path is this module', () => {
    expect(isEntrypoint(SELF, {}, ['node', '/x/node_modules/.bin/vitest'])).toBe(false);
  });

  it('false with no entry information at all (fails closed)', () => {
    expect(isEntrypoint(SELF, {}, ['node'])).toBe(false);
  });

  it('pm_exec_path wins over a mismatched argv[1]', () => {
    const env = { pm_exec_path: SERVER };
    expect(isEntrypoint(SELF, env, ['node', '/some/other/file.js'])).toBe(true);
  });
});
