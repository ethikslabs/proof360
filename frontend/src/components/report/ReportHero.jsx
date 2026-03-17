import TrustScoreRing from './TrustScoreRing';

export default function ReportHero({ report }) {
  const { company_name, assessed_at, trust_score, deal_readiness_score, headline } = report;
  const date = new Date(assessed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-b border-gray-100">
      <div>
        <p className="text-sm text-gray-400 mb-1">{date}</p>
        <h1 className="font-serif text-3xl text-gray-900 mb-3">{company_name}</h1>
        <p className="text-2xl font-serif text-gray-800 leading-snug mb-2">
          Enterprise-ready in {headline.ready_count} {headline.ready_count === 1 ? 'area' : 'areas'}.<br />
          {headline.blocking_count} {headline.blocking_count === 1 ? 'gap' : 'gaps'} blocking deals now.
        </p>
        <p className="text-sm text-gray-500 mb-4">{headline.summary_line}</p>
        <span className="inline-flex items-center gap-1.5 text-sm bg-[#EAF3DE] text-[#3A7A3A] px-3 py-1.5 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-[#3A7A3A] inline-block" />
          Enterprise deal readiness: {deal_readiness_score} / 100
        </span>
      </div>
      <div className="flex justify-center md:justify-end">
        <TrustScoreRing score={trust_score} />
      </div>
    </div>
  );
}
