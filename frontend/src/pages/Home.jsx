import Hero from '../components/homepage/Hero';
import OutcomeStrip from '../components/homepage/OutcomeStrip';
import ReportTeaser from '../components/homepage/ReportTeaser';
import HowItWorks from '../components/homepage/HowItWorks';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-3xl mx-auto border-x border-gray-100 min-h-screen">
        <div className="px-8 py-4 border-b border-gray-100">
          <span className="font-serif text-xl text-gray-900">Proof<span className="italic">360</span></span>
        </div>
        <Hero />
        <OutcomeStrip />
        <ReportTeaser />
        <HowItWorks />
      </div>
    </div>
  );
}
