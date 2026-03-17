import { useState } from 'react';
import { captureEmail } from '../../api/client';

export default function EmailGate({ sessionId, onUnlock }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await captureEmail(sessionId, { email });
      onUnlock();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="font-serif text-lg text-gray-900 mb-1">Save your trust report</h3>
      <p className="text-sm text-gray-500 mb-4">
        Get your full action plan, track improvements, and share your readiness with your team. No password needed.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save report'}
        </button>
      </form>
      {error && <p className="text-xs text-[#C2432A] mt-2">{error}</p>}
      <p className="text-xs text-gray-400 mt-2">Saving unlocks the full breakdown and score trajectory</p>
    </div>
  );
}
