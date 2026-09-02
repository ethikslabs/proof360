// Command matching, kept out of the component file so it is testable on its own and so
// the palette file exports components only (fast-refresh keeps working).
//
// Subsequence matching — "opw" finds "Open the working". Deliberately NOT a fuzzy-search
// library: over a few dozen commands the scoring in those libraries is exactly what
// makes results feel arbitrary, and arbitrary ordering is worse than no ordering in a
// surface people navigate by muscle memory.

export function matchCommand(query, label) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return 0;
  const l = String(label ?? '').toLowerCase();
  const direct = l.indexOf(q);
  if (direct === 0) return 3;        // prefix — the strongest signal
  if (direct > 0) return 2;          // substring
  let i = 0;
  for (const ch of l) if (ch === q[i]) i += 1;
  return i === q.length ? 1 : 0;     // subsequence, or no match
}

export function rankCommands(commands, query) {
  if (!String(query ?? '').trim()) return commands ?? [];
  return (commands ?? [])
    .map((c) => ({ c, score: matchCommand(query, c.label) }))
    .filter((x) => x.score > 0)
    // Stable within a score: a palette people navigate by muscle memory must not
    // reshuffle equal-ranked items between keystrokes.
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}
