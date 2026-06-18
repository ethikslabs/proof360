import { useEffect, useState } from 'react';
import { getJourney } from '../api/client';

export default function Journey() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});

  useEffect(() => { getJourney().then(setData).catch((e) => setError(String(e))); }, []);

  if (error) return <main style={{ padding: 32 }}>Could not load your journey: {error}</main>;
  if (!data) return <main style={{ padding: 32 }}>Loading your journey…</main>;
  if (!data.entries?.length) {
    return <main style={{ padding: 32 }}><h1>Your journey</h1><p>Your journey starts at your first read.</p></main>;
  }

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1>Your trust journey{data.company?.name ? ` — ${data.company.name}` : ''}</h1>
      <ol style={{ listStyle: 'none', padding: 0, borderLeft: '2px solid #ddd' }}>
        {data.entries.map((e) => (
          <li key={e.session_id} style={{ position: 'relative', padding: '12px 0 12px 20px' }}>
            <button
              onClick={() => setOpen((o) => ({ ...o, [e.session_id]: !o[e.session_id] }))}
              style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
              <strong>{e.label || e.session_id}</strong>
              <span style={{ color: '#888', marginLeft: 8 }}>
                {new Date(e.occurred_at).toLocaleDateString()} · {e.claims.length} item{e.claims.length === 1 ? '' : 's'}
              </span>
            </button>
            {open[e.session_id] && (
              <ul style={{ marginTop: 8 }}>
                {e.claims.map((c, i) => (
                  <li key={i}>{c.statement} <em style={{ color: '#aaa' }}>({c.authority})</em></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
