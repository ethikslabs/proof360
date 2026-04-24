import { useState, useEffect } from 'react';
import { getProgramMatch } from '../api/client.js';
import { useFeatureFlags } from '../contexts/FeatureFlagContext.jsx';
import ConfidenceChip from './ConfidenceChip.jsx';

/**
 * Skeleton shimmer placeholder shown while the program match API loads.
 * Pure CSS animation — no external library.
 */
function SkeletonShimmer() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 w-64 rounded bg-gray-200" />
      <div className="border border-gray-100 rounded-lg p-5 space-y-2">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-3/4 rounded bg-gray-100" />
      </div>
      <div className="border border-gray-100 rounded-lg p-5 space-y-2">
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function ProgramMatchCard({ sessionId }) {
  const flags = useFeatureFlags();
  const [programs, setPrograms] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !flags?.layer2_cards?.program_match) return;

    let cancelled = false;
    getProgramMatch(sessionId)
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : data?.programs ?? [];
          setPrograms(list);
        }
      })
      .catch(() => {
        if (!cancelled) setPrograms([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId, flags?.layer2_cards?.program_match]);

  // Feature flag gate — render nothing when disabled
  if (!flags?.layer2_cards?.program_match) return null;

  // Loading state — skeleton shimmer
  if (loading) return <SkeletonShimmer />;

  // Zero programs or error — self-hide
  if (!programs || programs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#3A7A3A]">
        AWS funding programs you may qualify for
      </h3>

      {programs.map((program) => (
        <div
          key={program.program_id}
          className="border border-gray-100 rounded-lg overflow-hidden"
          style={{ backgroundColor: '#EAF3DE' }}
        >
          <div className="px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#3A7A3A]">
                {program.name}
              </span>
              <ConfidenceChip level={program.confidence} />
            </div>

            <p className="text-[13px] text-gray-700 leading-relaxed">
              {program.benefit}
            </p>

            {program.eligibility_reason && (
              <p className="text-xs text-gray-500">
                {program.eligibility_reason}
              </p>
            )}

            <a
              href={program.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-[#3A7A3A] underline underline-offset-2 hover:text-[#2d5f2d] transition-colors"
            >
              Learn more →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
