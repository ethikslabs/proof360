// frontend/src/hooks/useSurfaceAuthority.js
import { useState, useCallback, useRef } from 'react';

const SUGGEST_THRESHOLD = 0.25;

const SURFACE_KEY = { Chat: 'chat', 'Vendor Intelligence': 'projection' };
const SURFACE_NAME = { chat: 'Chat', projection: 'Vendor Intelligence' };

export function useSurfaceAuthority() {
  // Continuous authority scores, bounded [0,1]. Chat starts dominant.
  const [scores, setScores] = useState({ chat: 0.7, projection: 0.3 });
  // Which surface currently holds primary authority
  const [surfaceAuthority, setSurfaceAuthority] = useState('Chat');
  // Active suggestion (SUGGEST phase) or null (NOTICE/WAIT/idle)
  const [suggestion, setSuggestion] = useState(null);
  // Dismissed directions for this session turn — reset by resetTurn()
  const dismissedRef = useRef(new Set());
  // Current authority key — kept in ref to avoid stale closure in callbacks
  const authorityKeyRef = useRef('chat');

  const maybeOfferSuggestion = useCallback((newScores, currentKey) => {
    const other = currentKey === 'chat' ? 'projection' : 'chat';
    const gap = newScores[other] - newScores[currentKey];
    if (gap >= SUGGEST_THRESHOLD) {
      const direction = `${currentKey}→${other}`;
      if (!dismissedRef.current.has(direction)) {
        setSuggestion({ to: SURFACE_NAME[other], direction });
      }
    }
  }, []);

  // Call when user types, submits, or is reading chat — raises chat score
  const recordChatActivity = useCallback(() => {
    setScores(prev => {
      const next = {
        chat: Math.min(1, prev.chat + 0.35),
        projection: Math.max(0, prev.projection - 0.1),
      };
      const total = next.chat + next.projection;
      if (total > 0) { next.chat = next.chat / total; next.projection = next.projection / total; }
      // Chat activity clears projection-intent suggestions
      setSuggestion(s => (s?.direction?.includes('→projection') ? null : s));
      maybeOfferSuggestion(next, authorityKeyRef.current);
      return next;
    });
  }, [maybeOfferSuggestion]);

  // Call when vendor intent signal fires — mode tile select, vendor comparison pattern
  const recordProjectionIntent = useCallback(() => {
    setScores(prev => {
      const next = {
        chat: Math.max(0, prev.chat - 0.05),
        projection: Math.min(1, prev.projection + 0.4),
      };
      const total = next.chat + next.projection;
      if (total > 0) { next.chat = next.chat / total; next.projection = next.projection / total; }
      maybeOfferSuggestion(next, authorityKeyRef.current);
      return next;
    });
  }, [maybeOfferSuggestion]);

  // User taps ✓ on suggestion chip — authority transfers (COMMIT phase)
  const commit = useCallback((surface) => {
    const key = SURFACE_KEY[surface] ?? 'chat';
    authorityKeyRef.current = key;
    setSurfaceAuthority(surface);
    setSuggestion(null);
    // dismissedRef.current.clear() — REMOVED: resetTurn() is the sole reset mechanism
    setScores({
      chat: key === 'chat' ? 0.8 : 0.2,
      projection: key === 'projection' ? 0.8 : 0.2,
    });
  }, []);

  // User taps ✕ — suggestion suppressed for this turn (DISMISS phase)
  const dismiss = useCallback((direction) => {
    dismissedRef.current.add(direction);
    setSuggestion(null);
  }, []);

  // Call at the start of each user message — resets DISMISS suppression (new session turn)
  const resetTurn = useCallback(() => {
    dismissedRef.current.clear();
  }, []);

  // Elastic flex values for desktop surface layout
  // Chat authority: chat=1.6, projection=0.9
  // Projection authority: chat=0.8, projection=1.7
  const surfaceFlex = {
    chat: surfaceAuthority === 'Chat' ? 1.6 : 0.8,
    projection: surfaceAuthority === 'Chat' ? 0.9 : 1.7,
  };

  return {
    surfaceAuthority,
    suggestion,
    scores,
    surfaceFlex,
    recordChatActivity,
    recordProjectionIntent,
    commit,
    dismiss,
    resetTurn,
  };
}
