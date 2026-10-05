import { pathToFileURL } from 'node:url';

/**
 * True when the calling module IS the process entry point — so start()/listen runs
 * for `node src/server.js` AND under pm2, but NOT when a test imports the module.
 *
 * The naive guard `import.meta.url === \`file://${process.argv[1]}\`` works for a bare
 * `node src/server.js`, but pm2 (fork mode) does NOT exec the script directly: it
 * launches its own ProcessContainerFork and imports the script as a module, leaving
 * process.argv[1] pointing at the pm2 wrapper. The guard then evaluated false, start()
 * never ran, and nothing bound the port — the API process was "online" yet dead
 * (2026-10-05 prod outage: N1's refactor moved listen behind this guard).
 *
 * pm2 exposes the real script via process.env.pm_exec_path, so prefer it; fall back to
 * argv[1] for direct `node` runs. A test runner sets neither to this module, so the
 * predicate is false on import and the server does not boot under vitest.
 *
 * @param {string} moduleUrl   the caller's import.meta.url
 * @param {NodeJS.ProcessEnv} [env]  defaults to process.env
 * @param {string[]} [argv]     defaults to process.argv
 * @returns {boolean}
 */
export function isEntrypoint(moduleUrl, env = process.env, argv = process.argv) {
  const entryPath = env.pm_exec_path || argv[1] || '';
  return !!entryPath && moduleUrl === pathToFileURL(entryPath).href;
}
