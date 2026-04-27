// Override stack invariant tests
// Tests: system never beats human, cross-actor conflict, latest human = current_value,
//        conflict resolution preserves both prior values

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Postgres pool before importing signal-store
vi.mock('../../src/db/pool.js', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    default: { connect: vi.fn(() => mockClient), __mockClient: mockClient },
    query: vi.fn(),
  };
});

import pool, { query } from '../../src/db/pool.js';
import { applyOverride, resolveConflict } from '../../src/services/signal-store.js';

const mockClient = pool.__mockClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Override Stack', () => {
  it('system override SHALL NOT beat human override', async () => {
    // Setup: existing signal with human override
    const existingSignal = {
      id: 'sig-1', session_id: 'sess-1', field: 'stage',
      current_value: 'Series A', current_actor: 'founder', status: 'overridden',
    };

    // BEGIN
    mockClient.query.mockResolvedValueOnce(undefined);
    // SELECT ... FOR UPDATE → existing human-overridden signal
    mockClient.query.mockResolvedValueOnce({ rows: [existingSignal] });
    // INSERT signal_events (rescanned event — system override recorded but doesn't change value)
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'evt-1', event_type: 'rescanned', actor: 'system', new_value: 'Seed' }],
    });
    // COMMIT
    mockClient.query.mockResolvedValueOnce(undefined);

    const result = await applyOverride('sess-1', {
      field: 'stage', value: 'Seed', actor: 'system', reason: 'rescan',
    });

    // current_value should remain the human's value, not the system's
    expect(result.signal.current_value).toBe('Series A');
    expect(result.signal.current_actor).toBe('founder');
    expect(result.conflicted).toBe(false);
  });

  it('cross-actor conflict SHALL set status = conflicted', async () => {
    // Setup: existing signal overridden by founder
    const existingSignal = {
      id: 'sig-2', session_id: 'sess-1', field: 'stage',
      current_value: 'Series A', current_actor: 'founder', status: 'overridden',
    };

    // BEGIN
    mockClient.query.mockResolvedValueOnce(undefined);
    // SELECT ... FOR UPDATE
    mockClient.query.mockResolvedValueOnce({ rows: [existingSignal] });
    // UPDATE signals SET status = 'conflicted'
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...existingSignal, status: 'conflicted' }],
    });
    // INSERT signal_events (overridden event)
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'evt-2', event_type: 'overridden', actor: 'partner:tenant-1', new_value: 'Seed' }],
    });
    // COMMIT
    mockClient.query.mockResolvedValueOnce(undefined);

    const result = await applyOverride('sess-1', {
      field: 'stage', value: 'Seed', actor: 'partner:tenant-1', reason: 'correction',
    });

    expect(result.conflicted).toBe(true);
    expect(result.signal.status).toBe('conflicted');
  });

  it('latest human override = current_value', async () => {
    // Setup: existing signal with no prior human override (system-set)
    const existingSignal = {
      id: 'sig-3', session_id: 'sess-1', field: 'sector',
      current_value: 'saas', current_actor: 'system', status: 'overridden',
    };

    // BEGIN
    mockClient.query.mockResolvedValueOnce(undefined);
    // SELECT ... FOR UPDATE
    mockClient.query.mockResolvedValueOnce({ rows: [existingSignal] });
    // UPDATE signals SET current_value, current_actor, status
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...existingSignal, current_value: 'fintech', current_actor: 'founder', status: 'overridden' }],
    });
    // INSERT signal_events
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'evt-3', event_type: 'overridden', actor: 'founder', new_value: 'fintech' }],
    });
    // COMMIT
    mockClient.query.mockResolvedValueOnce(undefined);

    const result = await applyOverride('sess-1', {
      field: 'sector', value: 'fintech', actor: 'founder', reason: 'correction',
    });

    expect(result.signal.current_value).toBe('fintech');
    expect(result.signal.current_actor).toBe('founder');
  });

  it('conflict resolution preserves both prior values', async () => {
    const conflictedSignal = {
      id: 'sig-4', session_id: 'sess-1', field: 'stage',
      current_value: 'Series A', current_actor: 'founder', status: 'conflicted',
    };

    // BEGIN
    mockClient.query.mockResolvedValueOnce(undefined);
    // SELECT ... FOR UPDATE
    mockClient.query.mockResolvedValueOnce({ rows: [conflictedSignal] });
    // SELECT signal_events (two competing values)
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { actor: 'partner:tenant-1', new_value: 'Seed' },
        { actor: 'founder', new_value: 'Series A' },
      ],
    });
    // UPDATE signals SET current_value, status = 'overridden'
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...conflictedSignal, current_value: 'Series A', status: 'overridden', current_actor: 'founder' }],
    });
    // INSERT signal_events (conflict_resolved)
    const resolvedEvent = {
      id: 'evt-5', event_type: 'conflict_resolved', actor: 'founder',
      reason: JSON.stringify({
        resolved_from: { 'partner:tenant-1': 'Seed', founder: 'Series A' },
        chosen: 'Series A',
        reason: 'founder knows best',
      }),
      prior_value: 'Series A', new_value: 'Series A',
    };
    mockClient.query.mockResolvedValueOnce({ rows: [resolvedEvent] });
    // COMMIT
    mockClient.query.mockResolvedValueOnce(undefined);

    const result = await resolveConflict('sess-1', {
      field: 'stage', chosen_value: 'Series A', actor: 'founder', reason: 'founder knows best',
    });

    // The event reason should contain both competing values
    const reason = JSON.parse(result.event.reason);
    expect(reason.resolved_from).toEqual({
      'partner:tenant-1': 'Seed',
      founder: 'Series A',
    });
    expect(reason.chosen).toBe('Series A');
    expect(result.signal.status).toBe('overridden');
  });
});
