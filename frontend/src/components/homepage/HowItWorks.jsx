import { Link } from 'react-router-dom';

const STEPS = [
  'Upload your website or answer a few questions',
  'We analyse your trust posture against enterprise standards',
  'You get a clear path to enterprise-ready',
];

export default function HowItWorks() {
  return (
    <div className="px-8 py-12 border-t border-gray-100 text-center">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-8">How it works</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-10">
        {STEPS.map((s, i) => (
          <div key={i}>
            <p className="font-serif text-2xl text-gray-200 mb-2">{i + 1}</p>
            <p className="text-sm text-gray-600">{s}</p>
          </div>
        ))}
      </div>
      <Link
        to="/audit"
        className="inline-block px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Have a crack →
      </Link>
      <p className="text-xs text-gray-400 mt-3">Takes about 90 seconds. No technical knowledge required.</p>
    </div>
  );
}
