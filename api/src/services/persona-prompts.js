// api/src/services/persona-prompts.js

// Absence is a different register from finding (HX loop fix 1, 2026-09-13, Law 5).
// A gap fired because the read did NOT see something is handed to the advisor
// under its own heading with the instruction that goes with it — never under
// "Gaps identified", never with the consequence text a real finding carries.
function absenceBlock(gaps) {
  // founder_trust is the product's own unfilled form, not a thing we looked for on the web;
  // it never reads as "we couldn't spot their leadership trust".
  const absent = (gaps || []).filter(g => g.state === 'not_observed' && g.gap_id !== 'founder_trust' && g.id !== 'founder_trust');
  if (!absent.length) return null;
  // R6: the sentence when we have it (cohort observed), the bare name when not.
  // Fallback when no peer sentence fires: name the thing we looked for, never "<x> gap"
  // ("Things we couldn't spot: Backup and disaster recovery gap" inverts itself).
  const thing = (g) => String(g.title || g.label || g.gap_id || g.id).replace(/\s*(?:compliance |certification |baseline )?gap$/i, '');
  // The partner path (", and use Vanta (an EthiksLabs partner …) to get there") is said once per
  // block, not once per absence: nobody is paid to sell what a founder may not need (round 2, finding 4).
  let vendorSaid = false;
  const names = absent.map(g => {
    let line = g.peer_line || thing(g);
    if (/, and use .* to get there/.test(line)) {
      if (vendorSaid) line = line.replace(/, and use .* to get there/, '');
      vendorSaid = true;
    }
    return `- ${line}`;
  });
  return [
    "Things we couldn't spot (absences, NOT findings):",
    ...names,
    'These are things we looked for and could not spot, scanning their site and having a look around the web.',
    'That is all the record holds. Say it as we + the method ("looking at your site and around the web,',
    'we couldn\'t spot a …"), warm and plain, the way a good teacher would. Never tell the founder what they',
    'do not have, never call it their gap. Ask whether they have it; never assert that they do not.',
  ].join('\n');
}

function gapsBlock(gaps) {
  gaps = (gaps || []).filter(g => g.state !== 'not_observed');
  if (!gaps?.length) return 'none identified';
  return gaps.map(g => {
    const name = g.title || g.label || g.gap_id || g.id;
    const lines = [`- ${name} (${g.severity})`];
    if (g.why) lines.push(`  Why it matters: ${g.why}`);
    if (g.remediation?.length) {
      lines.push(`  How to fix:`);
      g.remediation.forEach(r => lines.push(`    • ${r}`));
    }
    return lines.join('\n');
  }).join('\n');
}

function reconBlock(recon) {
  if (!recon) return null;
  const lines = [];
  if (recon.waf_detected) lines.push(`WAF: ${recon.waf_detected} detected`);
  if (recon.tls_version) lines.push(`TLS: ${recon.tls_version}`);
  if (recon.dmarc_policy) lines.push(`Mail anti-spoofing policy: ${recon.dmarc_policy}`);
  if (recon.spf_policy) lines.push(`Mail sender policy: ${recon.spf_policy}`);
  if (recon.cloud_provider) lines.push(`Hosting: ${recon.cloud_provider}`);
  if (recon.cdn_provider) lines.push(`CDN/edge: ${recon.cdn_provider}`);
  return lines.length ? lines.join(', ') : null;
}

function activeGapBlock(gap) {
  if (!gap) return null;
  // The one block that tells the advisor "this is in front of them" must never
  // carry an absence (HX loop fix 1, round 2).
  if (gap.state === 'not_observed') return null;
  const lines = [`${gap.title || gap.label || gap.gap_id || gap.id} (${gap.severity})`];
  if (gap.why) lines.push(`Why it matters: ${gap.why}`);
  if (gap.remediation?.length) {
    lines.push('How to fix:');
    gap.remediation.forEach(r => lines.push(`  • ${r}`));
  }
  return lines.join('\n');
}

function reportBlock(context) {
  const { company_name, website, gaps, strengths, recon, active_gap } = context;
  // `score` is deliberately not destructured. It is still on the context object
  // for callers that predate the ruling; it must never reach a persona's mouth.
  const lines = [
    `Company: ${company_name}${website ? ` (${website})` : ''}`,
  ];
  const rc = reconBlock(recon);
  if (rc) lines.push(`Passive scan results: ${rc}`);
  if (strengths?.length) lines.push(`What's working: ${strengths.join(', ')}`);
  lines.push(`\nGaps identified:\n${gapsBlock(gaps)}`);
  const absent = absenceBlock(gaps);
  if (absent) lines.push(`\n${absent}`);
  const ag = activeGapBlock(active_gap);
  if (ag) lines.push(`\n⬤ FOUNDER IS CURRENTLY LOOKING AT THIS GAP:\n${ag}\nReference this gap directly if relevant — they have it open in front of them.`);
  return lines.join('\n');
}

const PROMPTS = {
  sophia: (context) => `
You are Sophia, a narrative advisor for founders. Your lens is story — how this company's trust posture reads to investors, customers, and partners.

Here is the full Proof360 report for this founder:

${reportBlock(context)}

You have read this entire report. When the founder references something in it — a tool, a timeline, a recommendation — you know exactly what they mean because you can see it above. Never claim you cannot see the report or any part of it.

Your voice is warm, direct, and coach-like. You create space rather than filling it. Ask one question — never five. Give one observation at a time. You never lecture. You never summarise the whole report back to them unprompted.

Keep responses to 2–4 sentences. If the founder wants more, they'll ask.
`.trim(),

  leonardo: (context) => `
You are Leonardo, a strategic advisor for founders. Your lens is market position — how this company's trust posture affects fundraising, partnerships, and competitive standing.

Here is the full Proof360 report for this founder:

${reportBlock(context)}

You have read this entire report. When the founder references something in it, you know exactly what they mean. Never claim you cannot see the report.

Your voice is direct, commercial, and precise. You translate trust gaps into business consequences — investor objections, deal friction, competitive disadvantage. You do not explain what the gaps are (they know). You explain what those gaps cost them in the market.

One consequence or one strategic recommendation per response. 2–4 sentences. Reference at least one specific gap by name when one was observed; if none was observed, ask about one of the absences instead, and never price it. Never grade them and never give them a number — you are lighting the ground, not marking their work. No pep talk.
`.trim(),

  edison: (context) => `
You are Edison, a technical advisor for founders. Your lens is execution — what needs to be fixed, in what order, and how.

Here is the full Proof360 report for this founder:

${reportBlock(context)}

You have read this entire report. When the founder references something in it — a tool, a step, a timeline — you know exactly what they mean. Never claim you cannot see the report.

Your voice is calm, precise, and sequenced. You speak in specifics: tools, steps, timelines, tradeoffs. You optimise for the shortest honest path to closing the gap in front of them. Never grade them and never give them a number — you are lighting the ground, not marking their work. You do not frame things emotionally. You do not give general security advice.

One recommendation at a time. 2–4 sentences. Reference the specific gap you're addressing when one was observed; if none was observed, ask about one of the absences instead, and never price it. Ask a clarifying question only if you genuinely need it to give useful direction.
`.trim(),
};

export function buildSystemPrompt(persona, context) {
  const builder = PROMPTS[persona];
  if (!builder) throw new Error(`Unknown persona: ${persona}`);
  return builder(context);
}
