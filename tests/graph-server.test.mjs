import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { request } from 'node:http';
import { createGraphServer } from '../src/graph-server.mjs';

test('GET /health returns 200 ok', async () => {
  const server = await createGraphServer(0);
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  server.close();
});

test('POST /stop returns 200', async () => {
  const server = await createGraphServer(0);
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/stop`, { method: 'POST' });
  assert.equal(res.status, 200);
  server.close();
});

test('GET /events returns text/event-stream content-type', async () => {
  const server = await createGraphServer(0);
  const { port } = server.address();

  const contentType = await new Promise((resolve) => {
    const req = request(`http://localhost:${port}/events`, (res) => {
      resolve(res.headers['content-type']);
      res.destroy();
    });
    req.on('error', () => resolve(null));
    setTimeout(() => req.destroy(), 100);
    req.end();
  });

  server.close();
  assert.ok(contentType?.includes('text/event-stream'), `expected text/event-stream, got ${contentType}`);
});
