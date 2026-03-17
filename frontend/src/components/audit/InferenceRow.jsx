import { useEffect, useState } from 'react';

const PILL = {
  confident: 'bg-[#EAF3DE] text-[#2B5210]',
  likely:    'bg-blue-50 text-blue-700',
  probable:  'bg-[#FAEEDA] text-[#B87314]',
};

export default function InferenceRow({ inference, resolveAt }) {
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setResolved(true), resolveAt);
    return () => clearTimeout(t);
  }, [resolveAt]);

  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors duration-300 ${resolved ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        {resolved ? (
          <svg className="w-4 h-4 text-[#3A7A3A] shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z"/>
          </svg>
        ) : (
          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin shrink-0" />
        )}
        <span className="text-sm text-gray-700">{inference.label}</span>
      </div>
      {resolved && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PILL[inference.confidence] || PILL.probable}`}>
          {inference.confidence}
        </span>
      )}
    </div>
  );
}
