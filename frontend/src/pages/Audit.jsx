import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startSession } from '../api/client';

export default function Audit() {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url && !file) { setError('Paste a URL or drop your deck to get started.'); return; }
    setError('');
    setLoading(true);
    try {
      const body = {};
      if (url) body.website_url = url;
      // deck_file upload would require multipart — URL is sufficient for MVP
      const { session_id } = await startSession(body);
      navigate(`/audit/reading?session=${session_id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="font-serif text-xl text-gray-900">Proof<span className="italic">360</span></span>
        </div>
        <p className="text-sm text-gray-400 mb-6">Paste your website URL or drop your pitch deck.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full px-4 py-3 text-sm border border-dashed border-gray-200 rounded-lg text-gray-400 text-center cursor-pointer hover:border-gray-300 transition-colors"
          >
            {file ? file.name : 'Drop deck here or click to upload (PDF, max 10MB)'}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {error && <p className="text-xs text-[#C2432A]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Starting...' : 'Have a crack →'}
          </button>
        </form>
      </div>
    </div>
  );
}
