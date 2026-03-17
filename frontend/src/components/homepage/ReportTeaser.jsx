export default function ReportTeaser() {
  return (
    <div className="px-8 py-12">
      <div className="max-w-xl mx-auto border border-gray-100 rounded-xl p-6 bg-gray-50">
        {/* Mock score ring */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-serif text-lg text-gray-900 leading-snug">
              Enterprise-ready in 3 areas.<br />
              <span className="text-[#C2432A]">2 gaps blocking deals now.</span>
            </p>
          </div>
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 64 64" className="w-16 h-16">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#E5E7EB" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="#3A7A3A" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 26 * 0.7} ${2 * Math.PI * 26 * 0.3}`}
                strokeDashoffset={2 * Math.PI * 26 * 0.25}
                strokeLinecap="round" />
              <text x="32" y="36" textAnchor="middle" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '14px', fill: '#1a1a1a' }}>70</text>
            </svg>
          </div>
        </div>

        {/* Mock gap card */}
        <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#FAECE7] text-[#C2432A] px-2 py-0.5 rounded-full font-medium">Critical</span>
            <span className="text-sm text-gray-700">SOC 2 certification gap</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Example report — your results will reflect your actual company.
        </p>
      </div>
    </div>
  );
}
