import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Proof360Mark } from '../Proof360Mark';

export default function ReportHeader({ isDemo, onSaveTrack, canSave }) {
  const [founderAuth] = useState(() => {
    const a = localStorage.getItem('founder_auth');
    return a ? JSON.parse(a) : null;
  });

  return (
    <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors no-underline" style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
          <Proof360Mark size={26} />
          Proof<span style={{ color: '#E07B39' }}>360</span>
        </Link>
        {isDemo && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
            Example
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {canSave && (
          <button
            onClick={onSaveTrack}
            className="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
          >
            Save & track →
          </button>
        )}
        {founderAuth ? (
          <Link to="/account" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            My account
          </Link>
        ) : (
          <Link to="/account/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
