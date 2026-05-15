import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';

export function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', maxWidth: 340, lineHeight: 1.7 }}>
          Drop a website, upload a deck, or describe your business.<br />
          We'll help you understand what the next stage demands.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
