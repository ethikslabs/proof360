/**
 * Custom Node ESM loader that transforms .jsx files into plain JS
 * and stubs Vite-specific APIs (import.meta.env) for non-Vite contexts.
 * Used by property tests that need to import constants from .jsx source files.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function load(url, context, nextLoad) {
  const isJsx = url.endsWith('.jsx');
  const needsEnvStub = !url.includes('node_modules') && (url.endsWith('.js') || isJsx);

  if (isJsx || needsEnvStub) {
    const filePath = fileURLToPath(url);
    let source = await readFile(filePath, 'utf8');

    // Stub import.meta.env for files that use Vite's env API
    if (source.includes('import.meta.env')) {
      source = `if (!import.meta.env) { import.meta.env = {}; }\n${source}`;
    }

    if (isJsx) {
      // Simple JSX stripping: replace JSX return expressions with null.
      // This works for our use case where we only need exported constants,
      // not rendered components.
      source = source
        // Replace JSX blocks (multi-line): <Tag ...>...</Tag> or <Tag ... />
        // Handles both uppercase components (<Component />) and lowercase HTML elements (<div>)
        .replace(/<[A-Za-z][^]*?\/>/gs, 'null')
        .replace(/<[A-Za-z][a-zA-Z.]*[^>]*>[^]*?<\/[A-Za-z][a-zA-Z.]*>/gs, 'null');
    }

    return {
      format: 'module',
      source,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
