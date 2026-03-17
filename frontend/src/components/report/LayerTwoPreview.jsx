function Bar({ label, pct }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3A7A3A] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function LayerTwoPreview({ report, preview }) {
  const bars = preview || [
    { label: 'Security posture', pct: 78 },
    { label: 'Vendor risk management', pct: 32 },
    { label: 'Policy documentation', pct: 55 },
  ];

  const topGap = report.gaps?.[0];

  return (
    <div className="p-6 border border-gray-200 rounded-lg">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">
        Full trust breakdown — save to unlock
      </p>
      {bars.map((b) => <Bar key={b.label} label={b.label} pct={b.pct} />)}
      {topGap && (
        <p className="text-xs text-gray-500 mt-3">
          Top blocker to closing enterprise deals:{' '}
          <span className="font-medium text-[#C2432A]">{topGap.title}</span>
        </p>
      )}
    </div>
  );
}
