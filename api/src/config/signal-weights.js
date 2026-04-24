export const SIGNAL_WEIGHTS = {
  critical: { weight: 1.0, signals: ['soc2', 'mfa', 'cyber_insurance'] },
  high:     { weight: 0.7, signals: ['incident_response', 'vendor_questionnaire', 'edr'] },
  medium:   { weight: 0.4, signals: ['sso', 'dmarc', 'security_headers'] },
  low:      { weight: 0.2, signals: ['spf', 'hsts'] },
  positive: { weight: 0.3, signals: ['cloud_provider', 'waf_detected', 'tls_current'] },
};
