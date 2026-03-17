import { useEffect, useRef } from 'react';

export default function TrustScoreRing({ score }) {
  const circleRef = useRef(null);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!circleRef.current) return;
    const offset = circumference - (score / 100) * circumference;
    circleRef.current.style.transition = 'stroke-dashoffset 1.2s ease-out';
    circleRef.current.style.strokeDashoffset = offset;
  }, [score, circumference]);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle
          ref={circleRef}
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="#3A7A3A"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" className="font-serif" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fill: '#1a1a1a', fontWeight: '400' }}>
          {score}
        </text>
        <text x="70" y="84" textAnchor="middle" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fill: '#6B7280' }}>
          /100
        </text>
      </svg>
    </div>
  );
}
