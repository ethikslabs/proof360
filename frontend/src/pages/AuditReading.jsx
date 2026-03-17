import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getInferStatus } from '../api/client';

const MESSAGES = [
  'Reading your homepage...',
  'Scanning product description...',
  'Detecting infrastructure signals...',
  'Checking compliance indicators...',
  'Identifying customer signals...',
];

export default function AuditReading() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(msgTimer);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let elapsed = 0;
    const poll = setInterval(async () => {
      elapsed += 1500;
      try {
        const { status } = await getInferStatus(sessionId);
        if (status === 'complete') {
          clearInterval(poll);
          navigate(`/audit/cold-read?session=${sessionId}`);
        } else if (status === 'failed' || elapsed > 60000) {
          clearInterval(poll);
          setError('We had trouble reading your site. Please try again.');
        }
      } catch {
        // keep polling
      }
    }, 1500);
    return () => clearInterval(poll);
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-sm text-gray-500 transition-opacity">{MESSAGES[msgIndex]}</p>
        {error && <p className="text-xs text-[#C2432A] mt-4 max-w-xs">{error}</p>}
      </div>
    </div>
  );
}
