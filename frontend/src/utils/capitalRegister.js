// Reads the Capital Rosetta register — _working/2026-08-28-capital-rosetta-register.md,
// ratified 2026-09-03 — into instrument records the join can run on. The markdown is the
// truth; this is a reader, and scripts/project-register.mjs writes its output to
// src/data/capital-register.json with the source hash. Nothing here is authored: every
// field comes from the file, and a field the file does not carry is absent, not guessed.
//
// Record shape in the file: `### \`id\`` → a ```yaml fence of `key: value` lines (values
// may be scalars, [lists], {maps}, or a nested `variants:` list; continuations are
// indented) → prose sections **Failure modes.** **Misconceptions.** **Ready signals.**
// **Not-ready signals.** **Tells.** until the next `---`.

import { CLASSES } from './capitalJoin.js';

const PROSE_KEYS = {
  'Failure modes': 'failure_modes',
  'Misconceptions': 'misconceptions',
  'Ready signals': 'ready_signals',
  'Not-ready signals': 'not_ready_signals',
  'Tells': 'tells',
};

function splitTop(str, sep) {
  // split on `sep` at bracket depth 0
  const out = []; let depth = 0, cur = '';
  for (const ch of str) {
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim() !== '' || out.length) out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s !== '');
}

function scalar(v) {
  const t = v.trim();
  if (t === '' || t === 'null' || t === '~') return null;
  if (t === 'yes' || t === 'true') return true;
  if (t === 'no' || t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

export function parseValue(raw) {
  const t = raw.trim();
  if (t.startsWith('[') && t.endsWith(']')) return splitTop(t.slice(1, -1), ',').map(scalar);
  if (t.startsWith('{') && t.endsWith('}')) {
    const obj = {};
    for (const pair of splitTop(t.slice(1, -1), ',')) {
      const i = pair.indexOf(':');
      if (i === -1) continue;
      obj[pair.slice(0, i).trim()] = scalar(pair.slice(i + 1));
    }
    return obj;
  }
  return scalar(t);
}

// Minimal YAML for exactly the register's dialect: top-level `key: value` with indented
// continuation lines, and one nested list-of-maps under `variants:`.
export function parseYamlBlock(text) {
  const lines = text.split('\n');
  const out = {};
  let key = null, buf = '';
  let variants = null, variant = null;

  const flush = () => {
    if (key === null) return;
    if (key === 'variants') { if (variant) variants.push(variant); out.variants = variants || []; }
    else out[key] = parseValue(buf);
    key = null; buf = ''; variant = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, ''); // YAML comment — `requires: {...}   # plus a meritorious claim`
    if (line.trim() === '') continue;
    const top = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(line);
    if (top && !line.startsWith(' ')) {
      flush();
      key = top[1]; buf = top[2];
      if (key === 'variants') { variants = []; variant = null; }
      continue;
    }
    if (key === 'variants') {
      const item = /^\s*-\s+(\w+):\s*(.*)$/.exec(line);
      const cont = /^\s+(\w+):\s*(.*)$/.exec(line);
      if (item) { if (variant) variants.push(variant); variant = { [item[1]]: scalar(item[2]) }; }
      else if (cont && variant) variant[cont[1]] = scalar(cont[2]);
      else if (variant) { const last = Object.keys(variant).at(-1); variant[last] = `${variant[last]} ${line.trim()}`; }
      continue;
    }
    buf += ` ${line.trim()}`; // continuation
  }
  flush();
  return out;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function proseSections(text) {
  const out = {};
  const re = /\*\*([A-Za-z\- ]+)\.\*\*\s*([\s\S]*?)(?=\n\s*\n\*\*[A-Za-z\- ]+\.\*\*|\n---|$)/g;
  let m;
  while ((m = re.exec(text))) {
    const k = PROSE_KEYS[m[1].trim()];
    if (k) out[k] = m[2].replace(/\s+/g, ' ').trim();
  }
  return out;
}

// One record from the file's fields. Field names follow the schema (§4) where the file
// uses them; disqualifiers become { id, description } with no `test` — the join reports
// them as unevaluated until someone writes the structured condition.
function toRecord(id, y, prose, family) {
  const disq = Array.isArray(y.disqualifiers) ? y.disqualifiers : (y.disqualifiers ? [y.disqualifiers] : []);
  return {
    id,
    name: y.name ?? null,
    aliases: y.aliases ?? [],
    family: y.family ?? family ?? null,
    one_line: y.one_line ?? null,
    depth: y.depth ?? null,
    status: y.status ?? null,
    mechanics: {
      consideration_in: y.consideration_in ?? null,
      consideration_out: y.consideration_out ?? null,
      dilutive: y.dilutive ?? null,
      repayable: y.repayable ?? null,
      security_taken: y.security_taken ?? null,
      seniority: y.seniority ?? null,
      conversion: y.conversion ?? null,
      conversion_triggers: y.conversion_triggers ?? null,
      cost_of_capital_form: y.cost_of_capital_form ?? null,
      ticket_typical: y.ticket_typical ?? null,
      time_to_close: y.time_to_close ?? null,
      dilution_range: y.dilution_range ?? null,
    },
    requires: y.requires ?? {},
    helpful: y.helpful ?? {},
    // Two records write qualified or prose entries here — `parent FIN` (spv-per-asset),
    // `everything external` (deferred-salary). The schema has no notation for either;
    // they are carried verbatim as notes, not coerced into a class and not dropped.
    irrelevant: (y.irrelevant ?? []).filter((c) => CLASSES.includes(c)),
    irrelevant_notes: (y.irrelevant ?? []).filter((c) => !CLASSES.includes(c)).map(String),
    disqualifiers: disq.map((d) => ({ id: slug(d), description: String(d) })),
    provider: {
      classes: y.provider_classes ?? null,
      motivation: y.provider_motivation ?? null,
      default: y.provider_default ?? null,
      volume: y.provider_volume ?? null,
    },
    graph: {
      precedes: y.precedes ?? [], follows: y.follows ?? [], converts_to: y.converts_to ?? [],
      unlocks: y.unlocks ?? [], blocks: y.blocks ?? [], poisons: y.poisons ?? [], taints: y.taints ?? [],
      stacks_with: y.stacks_with ?? [], competes_with: y.competes_with ?? [], triggers: y.triggers ?? [], resets: y.resets ?? [],
    },
    reversibility: { reversibility: y.reversibility ?? null, forecloses: y.forecloses ?? [], unwind_cost: y.unwind_cost ?? null },
    jurisdiction: { sensitivity: y.jurisdiction_sensitivity ?? null, variants: y.variants ?? [] },
    evidence: {
      sources: y.evidence_sources ?? [],
      confidence: y.confidence ?? null,
      last_verified: y.last_verified ?? null,
      decay_rate: y.decay_rate ?? null,
    },
    knowledge: prose,
  };
}

export function parseRegister(markdown) {
  const records = [];
  const famRe = /^## ([A-Z-]+)\s*$/;
  const recRe = /^### `([a-z0-9-]+)`\s*$/;
  const lines = markdown.split('\n');
  let family = null;
  for (let i = 0; i < lines.length; i++) {
    const f = famRe.exec(lines[i]);
    if (f) { family = f[1].toLowerCase().replace('customer-funded', 'customer'); continue; }
    const r = recRe.exec(lines[i]);
    if (!r) continue;
    const id = r[1];
    // yaml fence
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('```')) j++;
    const start = j + 1;
    let end = start;
    while (end < lines.length && !lines[end].startsWith('```')) end++;
    const y = parseYamlBlock(lines.slice(start, end).join('\n'));
    // prose until next --- or next record
    let k = end + 1; const prose = [];
    while (k < lines.length && !/^---\s*$/.test(lines[k]) && !recRe.test(lines[k]) && !famRe.test(lines[k])) { prose.push(lines[k]); k++; }
    records.push(toRecord(id, y, proseSections(prose.join('\n')), family));
    i = k - 1;
  }
  return records;
}
