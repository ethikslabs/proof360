import { getPersonaResponses } from '../../src/data/mock/personas.js';
import { getThinkingSteps } from '../../src/data/mock/thinking.js';
import { getMockReport } from '../../src/data/mock/report.js';
import { getMockVendors } from '../../src/data/mock/vendors.js';

describe('mock data shapes', () => {
  it('persona response has required fields', () => {
    // Intent routing returns 1-2 personas (primary + optional handoff), not all 4
    const responses = getPersonaResponses('honey business at Kings Cross');
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses.length).toBeLessThanOrEqual(4);
    responses.forEach(r => {
      expect(r).toHaveProperty('persona');
      expect(r).toHaveProperty('role');
      expect(r).toHaveProperty('response');
      expect(['sofia', 'leonardo', 'edison', 'john_ai']).toContain(r.persona);
    });
  });

  it('thinking steps have required fields', () => {
    const steps = getThinkingSteps();
    expect(steps.length).toBeGreaterThan(3);
    steps.forEach(s => {
      expect(s).toHaveProperty('label');
      expect(s).toHaveProperty('provider');
      expect(['running', 'complete', 'failed']).toContain(s.status);
    });
  });

  it('report has 13 sections', () => {
    const report = getMockReport();
    expect(report.sections).toHaveLength(13);
    report.sections.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('content');
    });
  });

  it('vendors have timing bucket', () => {
    const vendors = getMockVendors();
    vendors.forEach(v => {
      expect(['now', 'soon', 'later']).toContain(v.timing);
      expect(v).toHaveProperty('name');
      expect(v).toHaveProperty('category');
      expect(v).toHaveProperty('reason');
    });
  });
});
