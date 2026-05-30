// proof360.au/live — verification agent (Bedrock direct, tool-use).
// The agent answers ONLY from real tool outputs. It cannot fabricate hashes or states.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { mint, tamper, attest, status } from '../lab/sandbox.js';

const REGION = process.env.BEDROCK_REGION || 'ap-southeast-2';
const MODEL = process.env.BEDROCK_MODEL || 'au.anthropic.claude-sonnet-4-6';
const MAX_STEPS = 4;

const client = new BedrockRuntimeClient({ region: REGION });

const SYSTEM = `You are the proof360 live verification agent. You are talking to a technical, skeptical audience (a CTO and investors) on a live call. Your job is to let them VERIFY the trust substrate, not to be sold to.

What this page is: a live console. The attestation machinery (VERITAS attest, Guard hash-chained audit) is REAL code running in an EPHEMERAL sandbox — nothing here writes to canonical state.

HONESTY CONTRACT — non-negotiable:
- Prefer SHOWING over telling. If asked "is this real or a mock", call a tool (lab_mint, lab_tamper) and report the ACTUAL returned hashes/results. Never invent a hash, receipt id, or state.
- Be honest about the gap: the automated CORPUS→VERITAS join is NOT built — it is hand-wired here (ticket VERITAS-CORPUS-001, status SPEC). Say so plainly. Do not imply a full automated pipeline exists.
- When a visitor's own claim attests to state "Unknown", explain that as the system REFUSING to rubber-stamp an unbacked claim — that refusal is the trust property, not a bug.
- Mark things LIVE vs SPEC accurately (use lab_status). The differentiated spine is LIVE; some depth is SPEC. The gap is wiring, not capability.
- This is not a wrapper: pull the model and the receipts, hashes, and audit chain still stand. Say it only if asked.

Style: terse, technical, concrete. Cite real artifacts. Two or three sentences unless asked for more.`;

const TOOLS = [
  { name: 'lab_mint', description: 'Mint a fresh real attested receipt over the sample CORPUS claim. Returns receipt (state, receipt_hash), the Guard hash-chained ledger, and chain_verified.', input_schema: { type: 'object', properties: {} } },
  { name: 'lab_tamper', description: 'Run the tamper test on the current session ledger: mutate one record and re-verify the hash chain. Returns before/after chain_verified and breaks_at. Requires a prior lab_mint in this session.', input_schema: { type: 'object', properties: {} } },
  { name: 'lab_attest', description: 'Attest an arbitrary claim the visitor supplies. With no backing evidence it returns state Unknown (the no-rubber-stamp property).', input_schema: { type: 'object', properties: { claim: { type: 'string' } }, required: ['claim'] } },
  { name: 'lab_status', description: 'Return the curated LIVE/SPEC two-axis ledger of the substrate.', input_schema: { type: 'object', properties: {} } },
];

async function runTool(name, input, sid) {
  switch (name) {
    case 'lab_mint': return await mint(sid);
    case 'lab_tamper': return tamper(sid);
    case 'lab_attest': return await attest(input?.claim);
    case 'lab_status': return status();
    default: return { error: 'unknown_tool', name };
  }
}

async function invoke(messages) {
  const body = { anthropic_version: 'bedrock-2023-05-31', max_tokens: 700, system: SYSTEM, tools: TOOLS, messages };
  const res = await client.send(new InvokeModelCommand({ modelId: MODEL, contentType: 'application/json', accept: 'application/json', body: JSON.stringify(body) }));
  return JSON.parse(new TextDecoder().decode(res.body));
}

// history: [{ role: 'user'|'assistant', text }]. Returns { reply, actions }.
export async function runAgent({ history = [], session_id }) {
  const messages = history.filter((m) => m && m.text).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: [{ type: 'text', text: String(m.text).slice(0, 4000) }] }));
  const actions = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    let out;
    try {
      out = await invoke(messages);
    } catch (err) {
      return { reply: `(* agent inference unavailable: ${err.name || 'error'}. The buttons above still run the real machinery directly. *)`, actions, error: err.name || 'invoke_failed' };
    }
    messages.push({ role: 'assistant', content: out.content });

    if (out.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of out.content) {
        if (block.type !== 'tool_use') continue;
        const result = await runTool(block.name, block.input, session_id);
        actions.push({ tool: block.name, result });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result).slice(0, 6000) });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    const reply = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return { reply: reply || '(no reply)', actions };
  }
  return { reply: '(stopped after max steps)', actions };
}
