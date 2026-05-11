import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { nodeTypeFor, labelFor, parentFor, buildNodeStart, buildEdge, buildComplete } from '../src/graph-events.mjs';

test('nodeTypeFor maps known api sources', () => {
  assert.equal(nodeTypeFor('firecrawl'), 'api');
  assert.equal(nodeTypeFor('dns'), 'api');
  assert.equal(nodeTypeFor('hibp'), 'api');
  assert.equal(nodeTypeFor('ssl'), 'api');
});

test('nodeTypeFor maps known model sources', () => {
  assert.equal(nodeTypeFor('perplexity'), 'model');
  assert.equal(nodeTypeFor('vector'), 'model');
  assert.equal(nodeTypeFor('gap_analysis'), 'model');
});

test('nodeTypeFor maps corpus to mcp', () => {
  assert.equal(nodeTypeFor('corpus'), 'mcp');
});

test('nodeTypeFor returns model for unknown sources', () => {
  assert.equal(nodeTypeFor('unknown_thing'), 'model');
});

test('buildNodeStart has required fields and correct nodeType', () => {
  const e = buildNodeStart('dns', 'quick');
  assert.equal(e.type, 'node_start');
  assert.equal(e.id, 'dns');
  assert.equal(e.nodeType, 'api');
  assert.equal(e.depth, 'quick');
  assert.ok(e.ts > 0);
});

test('buildEdge links source to target', () => {
  const e = buildEdge('entity', 'dns');
  assert.equal(e.type, 'edge');
  assert.equal(e.from, 'entity');
  assert.equal(e.to, 'dns');
});

test('buildComplete with stoppedAt null means natural finish', () => {
  const e = buildComplete(null);
  assert.equal(e.type, 'complete');
  assert.equal(e.stoppedAt, null);
});

test('buildComplete with stoppedAt string means stopped', () => {
  const e = buildComplete('quick');
  assert.equal(e.stoppedAt, 'quick');
});

test('parentFor returns entity for top-level api nodes', () => {
  assert.equal(parentFor('firecrawl'), 'entity');
  assert.equal(parentFor('dns'), 'entity');
  assert.equal(parentFor('perplexity'), 'entity');
});

test('parentFor returns upstream node for inference nodes', () => {
  assert.equal(parentFor('vector'), 'firecrawl');
  assert.equal(parentFor('gap_analysis'), 'vector');
});
