export default function NextSteps({ steps }) {
  return (
    <div className="px-8 py-8">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Recommended next steps</p>
      <div className="space-y-1">
        {steps.map((step) => (
          <button
            key={step.step_number}
            onClick={() => console.log('next_step_click', step.step_number)}
            className="w-full flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <span className="font-serif text-3xl text-gray-200 leading-none w-8 shrink-0">
              {step.step_number}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{step.title}</p>
              <p className="text-[11px] text-[#3A7A3A] mt-0.5">{step.score_trajectory}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.description}</p>
            </div>
            <span className="text-gray-300 group-hover:text-gray-400 transition-colors mt-1">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
