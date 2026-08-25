// session-followups.js — three persona follow-up questions, live and record-grounded
// (docs/plans/2026-08-25-persona-chips-and-proposal-cards.md, Task 1). One fast Bedrock
// call over the session's claims + open gaps + last exchange; STRICT JSON out, parsed
// defensively. No canned text: generation failure or unparseable output is an honest
// empty list, never a 500 and never fallback copy. Lamp register — the prompt asks for
// offers/questions grounded in a named fact of the record, never instructions.
import { getSession, updateSession } from '../services/session-store.js';
import { chatComplete } from '../lib/inference.js';
import { claimsProjection } from '../services/claims-projection.js';
import { sessionRecordSnapshot } from './record.js';

const MODEL = 'claude-haiku-4-5-20251001';
const PERSONAS = ['sofia', 'edison', 'leonardo'];
const LENSES = {
  sofia: 'Narrative & trust',
  edison: 'Technical & execution',
  leonardo: 'Strategy & market',
};
const MAX_QUESTION_LEN = 120;

function excerpt(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

// Cache key: the length of chat history is enough to detect "a new turn happened"
// without storing a hash of content — cheap and monotonic.
function turnKey(session) {
  return String((session.chat_history || []).length);
}

function buildPrompt(session) {
  const claims = claimsProjection(sessionRecordSnapshot(session));
  const namedClaims = claims
    .filter((c) => c.status !== 'rejected')
    .slice(-8)
    .map((c) => `- ${c.label} (${c.status}): ${c.value}`);

  const openGaps = (session.gaps || [])
    .filter((g) => g.status === 'open' || g.status === undefined)
    .map((g) => `- ${g.id} (${g.severity})`);

  const history = session.chat_history || [];
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');

  const lines = [
    `Company: ${session.company_name || 'unknown'}`,
    '',
    'Current claims (statement — status):',
    namedClaims.length ? namedClaims.join('\n') : '(none confirmed or inferred yet)',
    '',
    'Open gaps:',
    openGaps.length ? openGaps.join('\n') : '(none open)',
  ];
  if (lastUser) lines.push('', `Last user message: "${excerpt(lastUser.content, 200)}"`);
  if (lastAssistant) lines.push(`Last assistant reply: "${excerpt(lastAssistant.content, 200)}"`);

  lines.push(
    '',
    'Three persona lenses, one question each:',
    '- sofia: Narrative & trust',
    '- edison: Technical & execution',
    '- leonardo: Strategy & market',
    '',
    'For each persona, write ONE follow-up question in that persona\'s own voice, grounded',
    'in a named fact from the record above (a specific claim or gap — not a generic prompt).',
    'Phrase each as an offer or question (lamp register) — never an instruction, never',
    '"you should". Each question must be 120 characters or fewer.',
    '',
    'Reply with STRICT JSON only, no prose, no markdown fences, exactly this shape:',
    '{"followups":[{"persona":"sofia","question":"…"},{"persona":"edison","question":"…"},{"persona":"leonardo","question":"…"}]}',
  );
  return lines.join('\n');
}

// Extract the first {...} block and validate it defensively. Anything off-shape
// (missing persona, unknown persona, empty/too-long question, wrong count) fails
// closed — the caller returns an empty list rather than a partial or guessed set.
function parseFollowups(text) {
  if (!text) return [];
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  const list = parsed?.followups;
  if (!Array.isArray(list) || list.length !== 3) return [];

  const seen = new Set();
  const out = [];
  for (const entry of list) {
    const persona = entry?.persona;
    const question = typeof entry?.question === 'string' ? entry.question.trim() : '';
    if (!PERSONAS.includes(persona)) return [];
    if (seen.has(persona)) return [];
    if (!question || question.length > MAX_QUESTION_LEN) return [];
    seen.add(persona);
    out.push({ persona, question });
  }
  if (out.length !== PERSONAS.length) return [];
  return out;
}

async function generateFollowups(session) {
  let response;
  try {
    response = await chatComplete({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: buildPrompt(session) }],
      correlation_id: session.id,
    });
  } catch {
    return [];
  }
  const text = response?.choices?.[0]?.message?.content;
  return parseFollowups(text);
}

// GET /api/v1/session/:id/followups
export async function sessionFollowupsHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  const key = turnKey(session);
  const cache = session.followups_cache;
  if (cache && cache.turn_key === key) {
    return reply.send({ followups: cache.followups });
  }

  const followups = await generateFollowups(session);
  // Cache only real results — a marginal/failed generation must not blank the
  // whole turn's chips; the next fetch gets another chance (still one call per
  // fetch, so no hammering). Caught live 2026-08-25: first call cached [].
  if (followups.length) {
    updateSession(session.id, { followups_cache: { turn_key: key, followups } });
  }
  return reply.send({ followups });
}
