const OUTCOMES = [
  { label: '90-second audit', body: 'Understand your security and compliance posture instantly.' },
  { label: 'Trust score', body: 'See exactly what enterprise buyers and investors will ask about.' },
  { label: 'Fix the blockers', body: 'Get the fastest path to enterprise-ready, with time estimates.' },
];

export default function OutcomeStrip() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-t border-b border-gray-100">
      {OUTCOMES.map((o, i) => (
        <div key={i} className={`px-8 py-8 ${i < 2 ? 'md:border-r border-gray-100' : ''}`}>
          <p className="text-sm font-medium text-gray-800 mb-1">{o.label}</p>
          <p className="text-sm text-gray-500">{o.body}</p>
        </div>
      ))}
    </div>
  );
}
