import { useState } from 'react';
import ScorePreviewRow from './ScorePreviewRow';
import GapCardEvidence from './GapCardEvidence';
import VendorMatrix from './VendorMatrix';
import ConfidenceChip from '../ConfidenceChip.jsx';
import { shouldShowConfidenceChip } from '../confidenceUtils.js';

const SEVERITY = {
  critical: { pill: 'bg-[#FAECE7] text-[#C2432A]', label: 'Critical' },
  moderate: { pill: 'bg-[#FAEEDA] text-[#B87314]', label: 'Moderate' },
  low:      { pill: 'bg-[#EAF3DE] text-[#3A7A3A]', label: 'Low' },
};

export default function GapCard({ gap, trustScore, defaultOpen, overallConfidence }) {
  const [open, setOpen] = useState(defaultOpen);
  const sev = SEVERITY[gap.severity] || SEVERITY.low;
  const hasVendorIntel = gap.vendor_intelligence?.vendors?.length > 0;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.pill}`}>
            {sev.label}
          </span>
          {shouldShowConfidenceChip(gap.confidence, overallConfidence) && (
            <ConfidenceChip level={gap.confidence} />
          )}
          <span className="text-sm font-medium text-gray-800">{gap.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{gap.confidence} confidence</span>
          <span className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <p className="text-[13px] text-gray-600 leading-relaxed mt-4">{gap.why}</p>

          <ScorePreviewRow currentScore={trustScore} scoreImpact={gap.score_impact} />

          <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-1">Risk</p>
              <p className="text-gray-600">{gap.risk}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-1">Closes with</p>
              <p className="text-gray-600">{gap.control}</p>
            </div>
          </div>

          {gap.time_estimate && (
            <p className="text-[11px] font-bold text-[#3A7A3A] mt-3">{gap.time_estimate}</p>
          )}

          <GapCardEvidence evidence={gap.evidence} />

          {hasVendorIntel && (
            <VendorMatrix vendorIntelligence={gap.vendor_intelligence} />
          )}
        </div>
      )}
    </div>
  );
}
