import { useState, useRef, useEffect } from 'react';

export function useStt({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; });

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-AU';
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      onTranscriptRef.current(transcript);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    return () => {
      r.onend = null;
      r.onresult = null;
      r.abort();
    };
  }, []);

  function toggle() {
    const r = recognitionRef.current;
    if (!r) return;
    if (listening) { r.stop(); setListening(false); }
    else {
      try { r.start(); setListening(true); }
      catch (e) { if (e.name !== 'InvalidStateError') throw e; }
    }
  }

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  return { listening, toggle, supported };
}
