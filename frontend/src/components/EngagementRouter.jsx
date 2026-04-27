import { useState } from 'react';

/* ─── Palette (matches Report.jsx / OverridePanel.jsx) ───────────────────── */
const NAVY   = '#0B2545';
const AMBER  = '#E07B39';
const WHITE  = '#FFFFFF';
const MUTED  = '#667085';
const LIGHT  = '#98A2B3';
const BORDER = '#E4E7EC';

const PRIORITY_BADGE = {
  start_here:  { bg: '#FFF7ED', text: '#C2410C', label: 'Start here' },
  recommended: { bg: '#EFF6FF', text: '#3B82F6', label: 'Recommended' },
  optional:    { bg: '#F9FAFB', text: MUTED,     label: 'Optional' },
};

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/* ─── API helper (inline until task 13.5 wires client.js) ────────────────── */
async function postEngage(sessionId, body) {
  const res = await fetch(`${BASE}/api/v1/session/${sessionId}/engage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Engagement failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ─── Single vendor card ─────────────────────────────────────────────────── */
function VendorRoutingCard({ vendor, sessionId }) {
  const [engageState, setEngageState] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const routing = vendor.routing_options || {};
  const primary = routing.primary;
  const alternatives = routing.alternatives || [];
  const badge = PRIORITY_BADGE[vendor.priority] || PRIORITY_BADGE.optional;

  async function handleEngage(branch) {
    setEngageState('loading');
    setError('');
    try {
      const data = await postEngage(sessionId, {
        vendor_id: vendor.vendor_id,
        selected_branch: branch,
      });
      setResult(data);
      setEngageState('done');
    } catch (err) {
      setError(err.message || 'Engagement failed');
      setEngageState('error');
    }
  }

  return (
    <div style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: '18px 20px',
      background: WHITE,
      fontFamily: '"Outfit", sans-serif',
    }}>
      {/* Header: vendor name + priority badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
          {vendor.display_name}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: '3px 10px', borderRadius: 10,
          background: badge.bg, color: badge.text,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Closes gaps */}
      {vendor.closes_gaps && vendor.closes_gaps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {vendor.closes_gaps.map((gap) => (
            <span key={gap} style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 8px', borderRadius: 4,
              background: '#F3F4F6', color: MUTED,
              fontFamily: '"IBM Plex Mono", monospace',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {gap}
            </span>
          ))}
        </div>
      )}

      {/* Done state */}
      {engageState === 'done' && result && (
        <div style={{
          padding: '12px 14px', borderRadius: 7,
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          marginBottom: 10,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#15803D', margin: 0 }}>
            ✓ Routed — {result.routed_to?.name || result.status}
          </p>
        </div>
      )}

      {/* Error state */}
      {engageState === 'error' && error && (
        <p style={{ fontSize: 11, color: '#DC2626', marginBottom: 10 }}>
          {error}
        </p>
      )}

      {/* Primary action button */}
      {engageState !== 'done' && primary && (
        <button
          onClick={() => handleEngage(primary.party)}
          disabled={engageState === 'loading'}
          style={{
            width: '100%',
            padding: '10px 0',
            fontSize: 13, fontWeight: 600,
            background: engageState === 'loading' ? LIGHT : NAVY,
            color: WHITE,
            border: 'none', borderRadius: 7,
            cursor: engageState === 'loading' ? 'default' : 'pointer',
            fontFamily: '"Outfit", sans-serif',
            opacity: engageState === 'loading' ? 0.7 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          {engageState === 'loading' ? 'Routing…' : (primary.label || 'Engage')}
        </button>
      )}

      {/* Alternative routing options */}
      {engageState !== 'done' && alternatives.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {alternatives.map((alt) => (
            <button
              key={alt.party}
              onClick={() => handleEngage(alt.party)}
              disabled={engageState === 'loading'}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: 12, fontWeight: 600,
                background: WHITE,
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                cursor: engageState === 'loading' ? 'default' : 'pointer',
                fontFamily: '"Outfit", sans-serif',
                opacity: engageState === 'loading' ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {alt.label || alt.party}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── EngagementRouter ───────────────────────────────────────────────────── */
/**
 * Per-vendor routing UI. Renders only after Tier 2 publish.
 * Each vendor card shows primary routing action + alternatives.
 * On selection: POST /api/v1/session/:id/engage with { vendor_id, selected_branch }.
 * No computation — all routing options pre-resolved from derived_state.
 *
 * Props:
 *   sessionId              — session UUID
 *   vendorRecommendations  — array from derived_state.vendor_recommendations
 *   sessionStatus          — session status string
 */
export default function EngagementRouter({ sessionId, vendorRecommendations = [], sessionStatus }) {
  // Only visible after tier2_published
  if (sessionStatus !== 'tier2_published') return null;
  if (vendorRecommendations.length === 0) return null;

  return (
    <section style={{ fontFamily: '"Outfit", sans-serif' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: LIGHT,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          Engagement routing
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vendorRecommendations.map((vendor) => (
          <VendorRoutingCard
            key={vendor.vendor_id}
            vendor={vendor}
            sessionId={sessionId}
          />
        ))}
      </div>
    </section>
  );
}
