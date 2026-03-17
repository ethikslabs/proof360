export default function ScorePreviewRow({ currentScore, scoreImpact }) {
  return (
    <div className="inline-flex items-center gap-2 bg-[#EAF3DE] px-3 py-1.5 rounded-full my-3">
      <span className="text-xs text-[#3A7A3A] font-medium">
        Fix this gap: {currentScore} → {currentScore + scoreImpact}
        <span className="ml-1 text-[#3A7A3A]">(+{scoreImpact} trust score)</span>
      </span>
    </div>
  );
}
