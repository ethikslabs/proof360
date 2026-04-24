const CHIP_STYLES = {
  medium: { bg: 'bg-[#FEF3C7] text-[#B45309]', label: 'medium confidence' },
  low:    { bg: 'bg-[#FFEDD5] text-[#C2410C]', label: 'low confidence' },
};

export default function ConfidenceChip({ level }) {
  if (level === 'high' || !CHIP_STYLES[level]) return null;

  const style = CHIP_STYLES[level];

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg}`}>
      {style.label}
    </span>
  );
}
