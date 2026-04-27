// Engagement routing tests
// Tests: three branches route correctly, engagement requires tier2_published

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Postgres and signum-stub before importing
vi.mock('../../src/db/pool.js', () => ({
  query: vi.fn(),
}));

vi.mock('../../src/services/signum-stub.js', () => ({
  send: vi.fn(() => Promise.resolve()),
}));

import { query } from '../../src/db/pool.js';
import { routeEngagement } from '../../src/services/engagement-router.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Suppress console.error from fire-and-forget signum
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Engagement Routing', () => {
  it('john branch → internal handling, John commission attribution', async () => {
    // INSERT engagements → RETURNING
    query.mockResolvedValueOnce({
      rows: [{ id: 'eng-1', status: 'created', created_at: new Date().toISOString() }],
    });
    // INSERT engagement_events
    query.mockResolvedValueOnce({ rows: [] });
    // INSERT attribution_ledger (john gets 100%)
    query.mockResolvedValueOnce({ rows: [] });

    const result = await routeEngagement('sess-1', {
      vendor_id: 'vanta', selected_branch: 'john',
    });

    expect(result.engagement_id).toBe('eng-1');
    expect(result.status).toBe('created');
    expect(result.routed_to).toEqual({
      party: 'john', type: 'internal', name: 'Proof360 (John)',
    });

    // Verify attribution: john gets 100%
    const attrCall = query.mock.calls[2];
    expect(attrCall[0]).toContain('attribution_ledger');
    expect(attrCall[1]).toContain('john');
    expect(attrCall[1]).toContain(100);
  });

  it('distributor branch → matches tenant, ordered by priority', async () => {
    // SELECT tenants WHERE partner_branch = 'distributor'
    query.mockResolvedValueOnce({
      rows: [{ id: 'tenant-1', name: 'Ingram Micro AU' }],
    });
    // INSERT engagements
    query.mockResolvedValueOnce({
      rows: [{ id: 'eng-2', status: 'created', created_at: new Date().toISOString() }],
    });
    // INSERT engagement_events
    query.mockResolvedValueOnce({ rows: [] });
    // INSERT attribution_ledger (distributor 70%)
    query.mockResolvedValueOnce({ rows: [] });
    // INSERT attribution_ledger (john 30%)
    query.mockResolvedValueOnce({ rows: [] });

    const result = await routeEngagement('sess-2', {
      vendor_id: 'crowdstrike', selected_branch: 'distributor',
    });

    expect(result.engagement_id).toBe('eng-2');
    expect(result.routed_to).toEqual({
      tenant_id: 'tenant-1', name: 'Ingram Micro AU',
    });

    // Verify distributor tenant query uses correct ordering
    const tenantQuery = query.mock.calls[0][0];
    expect(tenantQuery).toContain('partner_branch');
    expect(tenantQuery).toContain('priority NULLS LAST');
  });

  it('vendor branch → direct attribution, no routing intermediary', async () => {
    // INSERT engagements
    query.mockResolvedValueOnce({
      rows: [{ id: 'eng-3', status: 'created', created_at: new Date().toISOString() }],
    });
    // INSERT engagement_events
    query.mockResolvedValueOnce({ rows: [] });
    // INSERT attribution_ledger (vendor 80%)
    query.mockResolvedValueOnce({ rows: [] });
    // INSERT attribution_ledger (john 20%)
    query.mockResolvedValueOnce({ rows: [] });

    const result = await routeEngagement('sess-3', {
      vendor_id: 'okta', selected_branch: 'vendor',
    });

    expect(result.engagement_id).toBe('eng-3');
    expect(result.routed_to).toEqual({
      party: 'vendor', type: 'direct', vendor_id: 'okta',
    });
  });

  it('engagement requires tier2_published status (unknown branch throws)', async () => {
    await expect(
      routeEngagement('sess-4', {
        vendor_id: 'vanta', selected_branch: 'invalid_branch',
      })
    ).rejects.toThrow('Unknown branch: invalid_branch');
  });
});
