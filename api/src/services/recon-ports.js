// Passive port probe — TCP connect to common ports with short timeout.
// Not a full scanner. Checks a curated list of ports that indicate risk
// when exposed: admin interfaces, unencrypted services, dev servers.

import net from 'net';
import { record as recordConsumption } from './consumption-emitter.js';

// Ports that should never be publicly reachable on a production host.
// Grouped by risk category for reporting.
const PROBE_PORTS = [
  { port: 21,   label: 'FTP',            risk: 'high',   note: 'Unencrypted file transfer — credentials sent in plaintext' },
  { port: 22,   label: 'SSH',            risk: 'medium', note: 'SSH open — acceptable if needed, verify key-only auth' },
  { port: 23,   label: 'Telnet',         risk: 'critical', note: 'Telnet open — unencrypted remote access, decommission immediately' },
  { port: 25,   label: 'SMTP',           risk: 'medium', note: 'SMTP open — may allow relay if misconfigured' },
  { port: 80,   label: 'HTTP',           risk: 'low',    note: 'HTTP open — acceptable if redirecting to HTTPS' },
  { port: 443,  label: 'HTTPS',          risk: 'none',   note: 'HTTPS open — expected' },
  { port: 3306, label: 'MySQL',          risk: 'critical', note: 'MySQL port exposed — database should never be publicly reachable' },
  { port: 5432, label: 'PostgreSQL',     risk: 'critical', note: 'PostgreSQL port exposed — database should never be publicly reachable' },
  { port: 6379, label: 'Redis',          risk: 'critical', note: 'Redis exposed — unauthenticated by default, full data access possible' },
  { port: 8080, label: 'HTTP alt',       risk: 'medium', note: 'Alternate HTTP port open — may be a dev server or admin UI' },
  { port: 8443, label: 'HTTPS alt',      risk: 'low',    note: 'Alternate HTTPS port open — check if this is intentional' },
  { port: 9200, label: 'Elasticsearch',  risk: 'critical', note: 'Elasticsearch exposed — unauthenticated in older versions, full index access' },
  { port: 27017, label: 'MongoDB',       risk: 'critical', note: 'MongoDB port exposed — historically unauthenticated by default' },
];

const CONNECT_TIMEOUT_MS = 2500;

function probePort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    function done(open) {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(open);
    }

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
    socket.connect(port, host);
  });
}

export async function reconPorts(domain, session_id) {
  // Probe all ports in parallel
  const results = await Promise.all(
    PROBE_PORTS.map(async ({ port, label, risk, note }) => {
      const open = await probePort(domain, port);
      return open ? { port, label, risk, note } : null;
    })
  );

  recordConsumption({ session_id, source: 'ports', units: 1, unit_type: 'api_calls', success: true, error: null });

  const open_ports = results.filter(Boolean);
  const risky = open_ports.filter(p => p.risk !== 'none' && p.risk !== 'low');
  const critical = open_ports.filter(p => p.risk === 'critical');

  return {
    source: 'ports',
    open_ports,
    risky_port_count: risky.length,
    critical_port_count: critical.length,
    has_exposed_db: critical.some(p => ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'].includes(p.label)),
    has_ssh: open_ports.some(p => p.label === 'SSH'),
    has_telnet: open_ports.some(p => p.label === 'Telnet'),
  };
}
