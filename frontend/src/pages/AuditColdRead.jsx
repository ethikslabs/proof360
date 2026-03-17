import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getInferences, submitSession } from '../api/client';
import InferenceRow from '../components/audit/InferenceRow';

export default function AuditColdRead() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [corrections, setCorrections] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [answers, setAnswers] = useState({});
  const [allResolved, setAllResolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    getInferences(sessionId)
      .then(setData)
      .catch(() => setError('We couldn\'t load your results. Please try again.'));
  }, [sessionId]);

  // Mark all rows resolved after last row's delay
  useEffect(() => {
    if (!data) return;
    const lastDelay = 800 + (data.inferences.length - 1) * 1000 + 500;
    const t = setTimeout(() => setAllResolved(true), lastDelay);
    return () => clearTimeout(t);
  }, [data]);

  function handleCorrect(field) {
    setEditingKey(field.key);
    setEditValue(corrections[field.key] || field.inferred_value.replace(' (probable)', ''));
  }

  function saveCorrection(key) {
    setCorrections((c) => ({ ...c, [key]: editValue }));
    setEditingKey(null);
  }

  function setAnswer(questionId, option) {
    setAnswers((a) => ({ ...a, [questionId]: option }));
  }

  const allAnswered = data?.followup_questions?.every((q) => answers[q.question_id]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await submitSession(sessionId, { corrections, followup_answers: answers });
      navigate(`/processing?session=${sessionId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  const followupCount = data.followup_questions?.length || 0;

  return (
    <div className="min-h-screen bg-white font-sans px-4 py-12">
      <div className="max-w-lg mx-auto">
        <p className="text-xs text-gray-400 mb-1">{data.company_name}</p>
        <h1 className="font-serif text-3xl text-gray-900 mb-2">Here's what we found</h1>
        <p className="text-sm text-gray-500 mb-8">
          We read your website. Here's our read — correct anything we got wrong.
        </p>

        {/* Inference list */}
        <div className="space-y-1 mb-6">
          {data.inferences.map((inf, i) => (
            <InferenceRow
              key={inf.inference_id}
              inference={inf}
              resolveAt={800 + i * 1000}
            />
          ))}
        </div>

        {/* Source attribution */}
        {allResolved && (
          <p className="text-xs text-gray-400 mb-6 animate-fadeIn">{data.source_summary}</p>
        )}

        {/* Corrections */}
        {allResolved && data.correctable_fields?.length > 0 && (
          <div className="mb-8">
            <div className="space-y-2">
              {data.correctable_fields.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs text-gray-400">{field.label}</p>
                    {editingKey === field.key ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
                          autoFocus
                        />
                        <button onClick={() => saveCorrection(field.key)} className="text-xs text-[#3A7A3A] font-medium">Save</button>
                        <button onClick={() => setEditingKey(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">{corrections[field.key] || field.inferred_value}</p>
                    )}
                  </div>
                  {editingKey !== field.key && (
                    <button onClick={() => handleCorrect(field)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                      Correct
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up questions */}
        {allResolved && followupCount > 0 && (
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-4">
              {followupCount === 1 ? 'One thing' : 'Two things'} we couldn't figure out
            </p>
            {data.followup_questions.map((q) => (
              <div key={q.question_id} className="mb-6">
                <p className="text-xs text-gray-400 mb-1">{q.context}</p>
                <p className="text-sm font-medium text-gray-800 mb-3">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(q.question_id, opt)}
                      className={`w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors ${
                        answers[q.question_id] === opt
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {allResolved && (followupCount === 0 || allAnswered) && (
          <div>
            {error && <p className="text-xs text-[#C2432A] mb-3">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Generating...' : 'Generate my trust report →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
