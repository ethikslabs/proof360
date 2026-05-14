import { renderHook, act } from '@testing-library/react';
import { useChatSession } from '../../src/hooks/useChatSession.js';

describe('useChatSession', () => {
  it('initialises with empty messages and no active persona', () => {
    const { result } = renderHook(() => useChatSession());
    expect(result.current.messages).toEqual([]);
    expect(result.current.activePersona).toBe(null);
    expect(result.current.phase).toBe('intake');
  });

  it('addUserMessage appends a user message', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.addUserMessage('We sell honey'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('We sell honey');
  });

  it('setActivePersona changes active persona', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.setActivePersona('sofia'));
    expect(result.current.activePersona).toBe('sofia');
  });

  it('setPhase advances the phase', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.setPhase('thinking'));
    expect(result.current.phase).toBe('thinking');
  });

  it('toggleDrawer opens and closes a drawer', () => {
    const { result } = renderHook(() => useChatSession());
    expect(result.current.openDrawers.evidence).toBe(false);
    act(() => result.current.toggleDrawer('evidence'));
    expect(result.current.openDrawers.evidence).toBe(true);
    act(() => result.current.toggleDrawer('evidence'));
    expect(result.current.openDrawers.evidence).toBe(false);
  });

  it('addPersonaMessages appends persona messages', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.addPersonaMessages([
      { persona: 'sofia', role: 'assistant', content: 'Sofia response' },
    ]));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].persona).toBe('sofia');
  });
});
