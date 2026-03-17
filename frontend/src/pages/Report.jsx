import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { demoReport } from '../data/demo-report';
import { getReport } from '../api/client';
import ReportHeader from '../components/report/ReportHeader';
import ReportHero from '../components/report/ReportHero';
import SnapshotThreeUp from '../components/report/SnapshotThreeUp';
import GapCard from '../components/report/GapCard';
import LayerTwoPreview from '../components/report/LayerTwoPreview';
import EmailGate from '../components/report/EmailGate';
import NextSteps from '../components/report/NextSteps';

const SEVERITY_ORDER = { critical: 0, moderate: 1, low: 2 };

export default function Report() {
  const { sessionId } = useParams();
  const isDemo = sessionId === 'demo';

  const [report, setReport] = useState(isDemo ? demoReport : null);
  const [locked, setLocked] = useState(isDemo ? false : true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemo) return;
    getReport(sessionId)
      .then((r) => { setReport(r); setLocked(r.layer2_locked); })
      .catch(() => setError('We couldn\'t load your report. Please try again.'));
  }, [sessionId, isDemo]);

  function handleUnlock() {
    setSaved(true);
    setLocked(false);
    // Re-fetch to get evidence + vendor_intelligence
    if (!isDemo) {
      getReport(sessionId)
        .then((r) => setReport(r))
        .catch(() => {});
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading your report...</p>
      </div>
    );
  }

  const sortedGaps = [...(report.gaps || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-3xl mx-auto border-x border-gray-100 min-h-screen">
        <ReportHeader isDemo={isDemo} />
        <ReportHero report={report} />
        <SnapshotThreeUp snapshot={report.snapshot} />

        {/* Gap cards */}
        <div className="px-8 py-8">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4">
            Trust gaps · click to understand
          </p>
          <div className="space-y-3">
            {sortedGaps.map((gap, i) => (
              <GapCard
                key={gap.gap_id}
                gap={gap}
                trustScore={report.trust_score}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </div>

        {/* Layer 2 */}
        <div className="px-8 pb-8">
          <LayerTwoPreview report={report} />
          {saved ? (
            <p className="text-sm text-[#3A7A3A] mt-4 text-center">Report saved ✓</p>
          ) : locked ? (
            <EmailGate sessionId={sessionId} onUnlock={handleUnlock} />
          ) : null}
        </div>

        {/* Strengths */}
        {report.strengths?.length > 0 && (
          <div className="px-8 pb-6 border-t border-gray-100 pt-6">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Strengths</p>
            <div className="flex flex-wrap gap-2">
              {report.strengths.map((s) => (
                <span key={s.category} className="text-xs bg-[#EAF3DE] text-[#3A7A3A] px-3 py-1 rounded-full">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.next_steps?.length > 0 && (
          <div className="border-t border-gray-100">
            <NextSteps steps={report.next_steps} />
          </div>
        )}
      </div>
    </div>
  );
}
