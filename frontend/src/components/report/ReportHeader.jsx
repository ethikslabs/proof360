export default function ReportHeader({ isDemo }) {
  return (
    <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
      <div className="font-serif text-xl text-gray-900">
        Proof<span className="italic">360</span>
      </div>
      <div className="flex items-center gap-3">
        {isDemo && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
            Example report
          </span>
        )}
        <span className="text-[11px] uppercase tracking-widest text-gray-400">
          Trust readiness report
        </span>
      </div>
    </div>
  );
}
