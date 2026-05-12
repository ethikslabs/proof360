import { EventEmitter } from 'node:events';

export const graphBus = new EventEmitter();

const SOURCE_TYPE_MAP = {
  firecrawl: 'api', dns: 'api', hibp: 'api', ssl: 'api',
  ports: 'api', github: 'api', ip: 'api', abuseipdb: 'api',
  perplexity: 'model', vector: 'model', gap_analysis: 'model', aws_programs: 'model',
  corpus: 'mcp',
  corpus_doc: 'document',
  spv: 'spv',
};

const SOURCE_LABEL_MAP = {
  firecrawl: 'Firecrawl', dns: 'DNS', hibp: 'HIBP', ssl: 'SSL Labs',
  ports: 'Port Scan', github: 'GitHub', ip: 'IP/ASN', abuseipdb: 'AbuseIPDB',
  perplexity: 'Perplexity', vector: 'VECTOR', gap_analysis: 'Gap Analysis',
  aws_programs: 'AWS Programs', corpus: 'CORPUS', corpus_doc: 'CORPUS Doc',
  spv: 'SPV Context',
  entity: 'Target',
};

const DEPTH_PARENT_MAP = {
  firecrawl: 'entity', dns: 'entity', hibp: 'entity', ssl: 'entity',
  ports: 'entity', github: 'entity', ip: 'entity', abuseipdb: 'entity',
  perplexity: 'entity',
  vector: 'firecrawl',
  corpus: 'entity',
  gap_analysis: 'vector',
  aws_programs: 'entity',
  spv: 'entity',
};

export function nodeTypeFor(source) { return SOURCE_TYPE_MAP[source] ?? 'model'; }
export function labelFor(source) { return SOURCE_LABEL_MAP[source] ?? source; }
export function parentFor(source) { return DEPTH_PARENT_MAP[source] ?? 'entity'; }

export function buildNodeStart(id, depth) {
  return { type: 'node_start', id, nodeType: nodeTypeFor(id), label: labelFor(id), depth, ts: Date.now() };
}
export function buildNodeComplete(id, ok, summary = ok ? 'ok' : 'failed') {
  return { type: 'node_complete', id, nodeType: nodeTypeFor(id), label: labelFor(id), ok, summary, ts: Date.now() };
}
export function buildEdge(from, to) {
  return { type: 'edge', from, to, ts: Date.now() };
}
export function buildReportSection(section, title, content) {
  return { type: 'report_section', section, title, content, ts: Date.now() };
}
export function buildDepthChange(depth, label) {
  return { type: 'depth_change', depth, label, ts: Date.now() };
}
export function buildInteractive(label) {
  return { type: 'interactive', label, ts: Date.now() };
}
export function buildComplete(stoppedAt) {
  return { type: 'complete', stoppedAt, ts: Date.now() };
}
export function emit(event) {
  graphBus.emit('event', event);
}
