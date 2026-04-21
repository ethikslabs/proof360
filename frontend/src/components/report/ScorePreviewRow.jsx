export default function ScorePreviewRow({ currentScore, scoreImpact }) {
  const newScore = currentScore + scoreImpact;
  return (
    <div className="flex items-stretch my-4 rounded-lg overflow-hidden border border-gray-100">
      <div className="flex-1 bg-gray-50 px-4 py-3 text-center">
        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Current</div>
        <div className="text-2xl font-light text-gray-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{currentScore}</div>
      </div>
      <div className="flex items-center px-3 text-gray-300 text-xl select-none">→</div>
      <div className="flex-1 bg-amber-50 px-4 py-3 text-center border-x border-amber-100">
        <div className="text-[10px] text-amber-600 uppercase tracking-widest mb-1">After fix</div>
        <div className="text-2xl font-semibold text-amber-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{newScore}</div>
      </div>
      <div className="bg-[#2D6A4F] px-5 py-3 text-center flex flex-col justify-center">
        <div className="text-[10px] text-green-200 uppercase tracking-widest mb-1">Gain</div>
        <div className="text-2xl font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>+{scoreImpact}</div>
      </div>
    </div>
  );
}
