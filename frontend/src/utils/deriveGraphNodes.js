// Maps inference + report data to a flat node list.
// Each node: { id, type, label, confidence?, severity?, meta? }
// Types: company | claim | gap | vendor | program | risk

export function deriveGraphNodes(inferences, reportData) {
  const nodes = [];

  if (inferences) {
    const nameInf = inferences.find(i => i.field === 'company_name');
    if (nameInf) {
      nodes.push({ id: 'company-0', type: 'company', label: nameInf.value, confidence: nameInf.confidence });
    }
    inferences
      .filter(i => i.field !== 'company_name')
      .forEach((inf, idx) => {
        nodes.push({ id: `claim-${idx}`, type: 'claim', label: `${inf.field}: ${inf.value}`, confidence: inf.confidence });
      });
  }

  if (reportData?.gaps) {
    reportData.gaps.forEach(g => {
      nodes.push({ id: `gap-${g.id}`, type: 'gap', label: g.label ?? g.id, severity: g.severity });
    });
  }

  if (reportData?.vendors) {
    reportData.vendors.forEach(v => {
      nodes.push({ id: `vendor-${v.id}`, type: 'vendor', label: v.name ?? v.id });
    });
  }

  return nodes;
}
