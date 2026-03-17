// Target customer → applicable compliance frameworks

export const FRAMEWORK_MAP = {
  banks: ['soc2', 'iso27001', 'apra_cps234', 'pci_dss'],
  enterprise: ['soc2', 'iso27001'],
  mid_market: ['soc2'],
  smb: ['basic_controls'],
  government: ['irap', 'essential_eight', 'iso27001'],
  pre_revenue: ['basic_controls'],
};
