import { getSession, getLogs } from '../services/session-store.js';

// GET /api/v1/session/:id/log
// Server-Sent Events stream of real extraction log lines.
// Closes when __done__ marker is appended or session reaches complete/failed.
export async function sessionLogHandler(req, reply) {
  const sessionId = req.params.id;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  let cursor = 0;
  let closed = false;
  let lastWriteAt = Date.now();

  function send(line) {
    if (closed) return;
    reply.raw.write(`data: ${JSON.stringify(line)}\n\n`);
    lastWriteAt = Date.now();
  }

  function close() {
    if (closed) return;
    clearInterval(interval);
    // Write __done__ BEFORE setting closed — send() guards on closed
    reply.raw.write(`data: ${JSON.stringify({ type: '__done__' })}\n\n`);
    closed = true;
    // Delay physical close — gives browser time to receive __done__ before
    // the connection drops, preventing false "stream dropped" errors
    setTimeout(() => {
      if (!reply.raw.destroyed) reply.raw.end();
    }, 500);
  }

  function flush() {
    if (closed) return;

    const session = getSession(sessionId);
    if (!session) {
      send({ text: '  ✗  Session not found or expired — start a new assessment', type: 'err' });
      close();
      return;
    }

    const logs = getLogs(sessionId);
    while (cursor < logs.length) {
      const line = logs[cursor++];
      if (line.type === '__done__') { close(); return; }
      send(line);
    }

    // Heartbeat: proxies (and some browsers) drop idle SSE connections after
    // ~30s of silence. An SSE comment line keeps the connection alive without
    // reaching the frontend — EventSource ignores lines starting with ':'.
    if (!closed && Date.now() - lastWriteAt > 15_000) {
      reply.raw.write(': ping\n\n');
      lastWriteAt = Date.now();
    }
  }

  const interval = setInterval(flush, 200);

  req.raw.on('close', () => {
    closed = true;
    clearInterval(interval);
  });

  // Safety timeout — must outlive the frontend's 150s poll ceiling (Chat.jsx)
  // so a slow analyze never gets its stream cut from under it.
  setTimeout(() => {
    clearInterval(interval);
    close();
  }, 160_000);
}
