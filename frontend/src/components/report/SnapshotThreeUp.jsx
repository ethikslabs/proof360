export default function SnapshotThreeUp({ snapshot }) {
  return (
    <div className="grid grid-cols-3 border-b border-gray-100">
      <div className="px-8 py-6 border-r border-gray-100">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Deal blockers</p>
        <p className="text-3xl font-serif text-[#C2432A] mb-1">{snapshot.deal_blockers}</p>
        <p className="text-xs text-gray-400">Fix before next procurement</p>
      </div>
      <div className="px-8 py-6 border-r border-gray-100">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Fundraising risk</p>
        <p className="text-3xl font-serif text-[#B87314] mb-1">{snapshot.fundraising_risk}</p>
        <p className="text-xs text-gray-400">Areas flagged in due diligence</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Strengths</p>
        <p className="text-3xl font-serif text-[#3A7A3A] mb-1">{snapshot.strengths}</p>
        <p className="text-xs text-gray-400">Already enterprise-grade</p>
      </div>
    </div>
  );
}
