import { deriveGraphNodes } from '../../src/utils/deriveGraphNodes.js';

describe('deriveGraphNodes', () => {
  it('returns empty array for null inputs', () => {
    expect(deriveGraphNodes(null, null)).toEqual([]);
  });

  it('creates a company node from inferences', () => {
    const inferences = [{ field: 'company_name', value: 'Hive & Co', confidence: 0.9 }];
    const nodes = deriveGraphNodes(inferences, null);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('company');
    expect(nodes[0].label).toBe('Hive & Co');
  });

  it('creates gap nodes from report gaps', () => {
    const gaps = [{ id: 'no_ssl', label: 'No SSL', severity: 'critical' }];
    const nodes = deriveGraphNodes(null, { gaps });
    const gapNodes = nodes.filter(n => n.type === 'gap');
    expect(gapNodes).toHaveLength(1);
    expect(gapNodes[0].label).toBe('No SSL');
  });

  it('creates vendor nodes from report vendors', () => {
    const vendors = [{ id: 'vanta', name: 'Vanta', closes_gaps: ['no_ssl'] }];
    const nodes = deriveGraphNodes(null, { vendors });
    const vendorNodes = nodes.filter(n => n.type === 'vendor');
    expect(vendorNodes).toHaveLength(1);
    expect(vendorNodes[0].label).toBe('Vanta');
  });

  it('creates claim nodes from non-company_name inferences', () => {
    const inferences = [
      { field: 'company_name', value: 'Test Co', confidence: 0.9 },
      { field: 'product_type', value: 'SaaS', confidence: 0.85 },
      { field: 'data_sensitivity', value: 'High', confidence: 0.92 },
    ];
    const nodes = deriveGraphNodes(inferences, null);
    const claimNodes = nodes.filter(n => n.type === 'claim');
    expect(claimNodes).toHaveLength(2);
    expect(claimNodes[0].label).toBe('product_type: SaaS');
    expect(claimNodes[1].label).toBe('data_sensitivity: High');
  });
});
