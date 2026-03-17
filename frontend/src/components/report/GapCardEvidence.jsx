import { useState } from 'react';

export default function GapCardEvidence({ evidence }) {
  const [open, setOpen] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Evidence {open ? '▾' : '›'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {evidence.map((e, i) => (
            <p key={i} className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{e.source}</span> — {e.citation}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
