import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { graphBus } from './graph-events.mjs';

export function createGraphServer(port = Number(process.env.GRAPH_PORT ?? 4360)) {
  const clients = new Set();
  const buffer = [];

  function broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    buffer.push(data);
    if (buffer.length > 1000) buffer.shift();
    for (const res of clients) res.write(data);
  }

  graphBus.on('event', broadcast);

  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;

    if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }

    if (path === '/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      // Send initial comment to ensure response headers are flushed
      res.write(':connected\n\n');
      // Replay buffered events
      buffer.forEach(data => res.write(data));
      clients.add(res);
      const cleanup = () => clients.delete(res);
      req.on('close', cleanup);
      res.on('error', cleanup);
      return;
    }

    if (path === '/stop' && req.method === 'POST') {
      graphBus.emit('stop');
      res.writeHead(200);
      return res.end('ok');
    }

    if (path === '/graph' && req.method === 'GET') {
      try {
        const html = await readFile(new URL('../public/graph.html', import.meta.url), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(html);
      } catch (err) {
        console.error(`[graph-server] /graph: ${err.message}`);
        res.writeHead(404); return res.end('graph.html not found — run after Task 4');
      }
    }

    if (path === '/graph.js' && req.method === 'GET') {
      try {
        const js = await readFile(new URL('../public/graph.js', import.meta.url), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(js);
      } catch (err) {
        console.error(`[graph-server] /graph.js: ${err.message}`);
        res.writeHead(404); return res.end('graph.js not found — run after Task 4');
      }
    }

    if (path === '/graph.css' && req.method === 'GET') {
      try {
        const css = await readFile(new URL('../public/graph.css', import.meta.url), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/css' });
        return res.end(css);
      } catch (err) {
        console.error(`[graph-server] /graph.css: ${err.message}`);
        res.writeHead(404); return res.end('graph.css not found — run after Task 4');
      }
    }

    res.writeHead(404); res.end();
  });

  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
