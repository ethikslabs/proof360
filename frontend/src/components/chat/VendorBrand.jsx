// Vendor identity, in context. John, 2026-09-02: "with the recommendation engine, we need
// the SVGs in context, eg: say Vanta, or Cisco, or CyberPro — anything, a visual notice
// that it is. So, the whole idea is to show that this is an ecosystem, not just a single
// place to do things."
//
// This is the NAMED TIMELINE ruling (2026-07-17) moved from the deck into the product:
// "the logos become part of the timeline, not badges beside it". The standing principle
// behind it is that readers do NOT know this ecosystem — the narrative teaches it by
// naming, and never relies on inference. A neutral list of words teaches nothing; a wall
// of recognisable marks says "these are real companies, and this thing walks you to them".
//
// HOW IT SCALES TO 40 VENDORS WITHOUT 40 HAND-DRAWN LOGOS
// Every vendor gets an identity immediately: a brand colour and an initials tile, which
// reads as deliberate rather than as a missing image. Vendors with a real mark render it
// instead. The registry is the one place to add marks over time — nothing else changes.
//
// THE MARKS HERE ARE PLACEHOLDERS. Same discipline as VendorMarks.jsx: simple geometric
// stand-ins so spacing and weight are real. Swap for each vendor's brand-kit SVG and check
// their trademark guidance before this leaves a demo.
//
// DISCLOSURE TRAVELS WITH THE LOGO. Canon requires a recommendation to carry its stake, so
// where we hold a commercial relationship the mark is accompanied by a quiet "partner"
// marker. Terms stay sealed — the RELATIONSHIP is disclosed, never the economics. A logo
// that looks like an endorsement without saying we have an interest is exactly the thing
// "no one here is paid to sell you something you don't need" exists to prevent.

const KNOWN = {
  vanta:        { color: '#6558f5' },
  cisco:        { color: '#1ba0d7' },
  cisco_duo:    { color: '#6bbf4b', name: 'Cisco Duo' },
  cisco_umbrella:{ color: '#1ba0d7', name: 'Cisco Umbrella' },
  austbrokers:  { color: '#00954d', name: 'Austbrokers CyberPro' },
  cyberpro:     { color: '#00954d', name: 'CyberPro' },
  arctic_wolf:  { color: '#00263e', name: 'Arctic Wolf' },
  cloudflare:   { color: '#f38020' },
  crowdstrike:  { color: '#e01a2b' },
  drata:        { color: '#5c4de0' },
  aws:          { color: '#ff9900' },
  microsoft:    { color: '#00a4ef' },
  google:       { color: '#4285f4' },
  fortinet:     { color: '#ee3124' },
  palo_alto:    { color: '#fa582d', name: 'Palo Alto Networks' },
  okta:         { color: '#007dc1' },
  onetrust:     { color: '#3e5aa9' },
  prescient:    { color: '#2b6cb0' },
  ingram:       { color: '#00539b', name: 'Ingram Micro' },
};

const FALLBACK = '#64748b';

/** Longest key wins, so cisco_duo is not swallowed by cisco. */
function brandFor(vendor) {
  const hay = `${vendor?.id ?? ''} ${vendor?.name ?? vendor?.display_name ?? ''}`
    .toLowerCase().replace(/[^a-z0-9]/g, '_');
  const hit = Object.keys(KNOWN)
    .filter((k) => hay.includes(k))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? { key: hit, ...KNOWN[hit] } : null;
}

export function vendorInitials(vendor) {
  const name = vendor?.name ?? vendor?.display_name ?? vendor?.id ?? '?';
  if (vendor?.initials) return String(vendor.initials).slice(0, 2).toUpperCase();
  return String(name)
    .split(/[\s_-]+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase() || '?';
}

export function vendorColor(vendor) {
  return brandFor(vendor)?.color ?? FALLBACK;
}

export function vendorLabel(vendor) {
  return brandFor(vendor)?.name
    ?? vendor?.name ?? vendor?.display_name ?? vendor?.id ?? 'Unknown';
}

/**
 * The tile. A mark when we have one, otherwise initials in the vendor's own colour —
 * an identity either way, never an empty square.
 */
export function VendorTile({ vendor, size = 26 }) {
  const brand = brandFor(vendor);
  const color = brand?.color ?? FALLBACK;
  const Mark = brand?.mark;
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}1f`, border: `1px solid ${color}55`, color,
        fontSize: size * 0.38, fontWeight: 700, letterSpacing: '-0.02em',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}
    >
      {Mark ? <Mark /> : vendorInitials(vendor)}
    </span>
  );
}

/**
 * Tile plus name, and the disclosure when we hold a relationship. `isPartner` falls back
 * to the vendor's own flag so callers cannot forget it — the disclosure should be hard to
 * drop, not something each surface remembers separately.
 */
export function VendorBrand({ vendor, size = 26, showName = true, isPartner, tk }) {
  const partner = isPartner ?? vendor?.is_partner ?? false;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <VendorTile vendor={vendor} size={size} />
      {showName && (
        <span style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 6, minWidth: 0,
          fontSize: 13, fontWeight: 600, color: tk?.ink ?? '#f1f5f9',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{vendorLabel(vendor)}</span>
          {partner && (
            <span
              title="We have a commercial relationship with this vendor."
              style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '1px 4px', borderRadius: 3,
                color: tk?.inkSoft ?? '#94a3b8',
                border: `1px solid ${tk?.hairline ?? '#94a3b855'}`,
                whiteSpace: 'nowrap',
              }}
            >
              partner
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default VendorBrand;
