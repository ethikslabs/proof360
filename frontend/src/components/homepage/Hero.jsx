import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="px-8 pt-20 pb-16 text-center max-w-2xl mx-auto">
      <h1 className="font-serif text-4xl md:text-5xl text-gray-900 leading-tight mb-4">
        Can you prove your startup is trusted?
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        Run a 90-second trust audit. See what's blocking enterprise deals — and how to fix it.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/audit"
          className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Have a crack →
        </Link>
        <Link to="/report/demo" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
          See an example report
        </Link>
      </div>
    </div>
  );
}
