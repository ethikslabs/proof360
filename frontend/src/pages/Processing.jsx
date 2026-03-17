import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStatus } from '../api/client';

const MESSAGES = [
  'Analysing your website security signals...',
  'Reviewing documentation indicators...',
  'Checking vendor risk posture...',
  'Cross-referencing enterprise trust frameworks...',
  'Mapping gaps to business outcomes...',
  'Preparing your trust report...',
];

export default function Processing() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let elapsed = 0;
    const poll = setInterval(async () => {
      elapsed += 2000;
      try {
        const { status } = await getStatus(sessionId);
        if (status === 'complete') {
          clearInterval(poll);
          navigate(`/report/${sessionId}`);
        } else if (status === 'failed' || elapsed > 60000) {
          clearInterval(poll);
          setError('Analysis didn\'t complete. Please go back and try again.');
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center">
      <div className="text-center max-w-sm px-4">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-sm text-gray-500">{MESSAGES[msgIndex]}</p>
        {error && (
          <div className="mt-6">
            <p className="text-xs text-[#C2432A] mb-3">{error}</p>
            <button
              onClick={() => navigate('/audit')}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Start again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
