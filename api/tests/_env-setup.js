// Runs in every vitest worker before any test file imports app code.
// Session persistence writes through to SESSION_STORE_DIR — point it at a
// throwaway tmpdir so no test ever touches the real ~/.ethikslabs store.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.SESSION_STORE_DIR ||= mkdtempSync(join(tmpdir(), 'p360-test-sessions-'));
