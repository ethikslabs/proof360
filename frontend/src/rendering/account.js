// The account is the founder's, or it is nothing.
//
// The settings panel used to render a module-level constant marked `// ── Mock
// data — demo founder profile ──` no matter who was signed in. John opened it on
// his own account and was shown an AWS Activate application under review, $1,000
// of Azure credits, a Vanta subscription renewing 14 Jun 2026, and a connected
// AWS Console (2026-08-26).
//
// A fabricated number is bad; a fabricated ACCOUNT states commercial
// relationships that do not exist, to the person they supposedly belong to.
//
// "Programs you've applied for through proof360" does have a true answer — the
// pathways the founder actually kept. Purchases, Integrations and Billing have no
// source at all, so they do not appear: an absent section is honest, an invented
// renewal is not.
function initialsFrom(name, email) {
  const src = (name || email || '').trim();
  if (!src) return null;
  const parts = src.split(/[\s.@_-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]).join('');
  return letters ? letters.toUpperCase() : null;
}

function programFrom(move) {
  const name = move?.item?.title || move?.item?.name || move?.label;
  if (!move?.cer_id || !name) return null;
  return {
    id: move.cer_id,
    name,
    category: move.item?.category ?? null,
    // The route is how it travels, shown small beside the thing itself.
    via: move.label && move.label !== name ? move.label : null,
    // Consent is the truth about a pathway's standing — withdrawn is not active.
    status: move.consent_state === 'withdrawn' ? 'withdrawn' : 'active',
    action: move.cta?.url ? { label: move.cta.label || 'Open', url: move.cta.url } : null,
  };
}

export function deriveAccount({ user, moves } = {}) {
  const name = user?.name || user?.email || null;
  const programs = (Array.isArray(moves) ? moves : [])
    .map(programFrom)
    .filter(Boolean);

  return {
    name,
    email: user?.email ?? null,
    initials: initialsFrom(user?.name, user?.email),
    programs,
    // Only what can be filled from something real.
    sections: programs.length ? ['programs'] : [],
  };
}

export default deriveAccount;
