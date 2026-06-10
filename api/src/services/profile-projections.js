const PROJECTION_KEYS = ['investor', 'vendors', 'aws', 'microsoft', 'posture', 'spv'];

function claim(snapshot, field) {
  return snapshot.current_claims?.[field] || null;
}

function hasClaim(snapshot, field) {
  return Boolean(claim(snapshot, field));
}

function claimValue(snapshot, field) {
  return claim(snapshot, field)?.value;
}

function ids(records) {
  return records.filter(Boolean).map((record) => record.id);
}

function observationsFor(snapshot, fields) {
  return (snapshot.observations || []).filter((obs) => fields.includes(obs.field));
}

function projection({ key, title, state, confidence, claims = [], observations = [], missing_inputs = [], explanation }) {
  return {
    key,
    title,
    state,
    confidence,
    contributing_claims: ids(claims),
    contributing_observations: ids(observations),
    missing_inputs,
    explanation,
  };
}

function investorProjection(snapshot) {
  const fields = ['company_name', 'website', 'stage', 'sector', 'product_type', 'customer_type'];
  const claims = fields.map((field) => claim(snapshot, field)).filter(Boolean);
  const missing = fields.filter((field) => !hasClaim(snapshot, field));
  const state = claims.length >= 4 ? 'partial' : claims.length >= 2 ? 'emerging' : 'unknown';
  const confidence = claims.length >= 5 ? 'medium' : claims.length >= 3 ? 'low' : 'low';
  return projection({
    key: 'investor',
    title: 'Investor Readiness',
    state,
    confidence,
    claims,
    observations: observationsFor(snapshot, fields),
    missing_inputs: missing,
    explanation: claims.length
      ? 'Investor view is forming from identity, market, stage, and customer signals.'
      : 'Investor view needs basic company identity and stage signals.',
  });
}

function vendorsProjection(snapshot) {
  const fields = ['sector', 'product_type', 'customer_type', 'data_sensitivity', 'handles_personal_data'];
  const claims = fields.map((field) => claim(snapshot, field)).filter(Boolean);
  const missing = fields.filter((field) => !hasClaim(snapshot, field));
  const state = claims.length >= 3 ? 'likely' : claims.length >= 1 ? 'emerging' : 'unknown';
  return projection({
    key: 'vendors',
    title: 'Vendor Pathways',
    state,
    confidence: claims.length >= 4 ? 'medium' : 'low',
    claims,
    observations: observationsFor(snapshot, fields),
    missing_inputs: missing,
    explanation: claims.length
      ? 'Vendor routing can start once the product, customer, and data shape are visible.'
      : 'Vendor routing needs product, customer, or risk signals.',
  });
}

function awsProjection(snapshot) {
  const fields = ['website', 'cloud_provider', 'stage', 'uses_ai', 'has_backup'];
  const claims = fields.map((field) => claim(snapshot, field)).filter(Boolean);
  const cloud = String(claimValue(snapshot, 'cloud_provider') || '').toLowerCase();
  const hasAwsSignal = cloud.includes('aws') || hasClaim(snapshot, 'aws_program_enrolled');
  const state = hasAwsSignal ? 'likely' : claims.length >= 2 ? 'possible' : 'unknown';
  return projection({
    key: 'aws',
    title: 'AWS Programs',
    state,
    confidence: hasAwsSignal ? 'medium' : 'low',
    claims,
    observations: observationsFor(snapshot, fields),
    missing_inputs: hasAwsSignal ? [] : ['cloud_provider', 'startup_age_or_stage'],
    explanation: hasAwsSignal
      ? 'AWS fit is supported by current cloud/program signals.'
      : 'AWS fit needs a cloud-provider or program-eligibility signal.',
  });
}

function microsoftProjection(snapshot) {
  const fields = ['cloud_provider', 'stage', 'uses_ai', 'customer_type'];
  const claims = fields.map((field) => claim(snapshot, field)).filter(Boolean);
  const cloud = String(claimValue(snapshot, 'cloud_provider') || '').toLowerCase();
  const hasMicrosoftSignal = cloud.includes('azure') || cloud.includes('microsoft') || hasClaim(snapshot, 'microsoft_program_enrolled');
  const state = hasMicrosoftSignal ? 'likely' : claims.length >= 2 ? 'possible' : 'unknown';
  return projection({
    key: 'microsoft',
    title: 'Microsoft Programs',
    state,
    confidence: hasMicrosoftSignal ? 'medium' : 'low',
    claims,
    observations: observationsFor(snapshot, fields),
    missing_inputs: hasMicrosoftSignal ? [] : ['cloud_provider', 'program_status'],
    explanation: hasMicrosoftSignal
      ? 'Microsoft fit is supported by current cloud/program signals.'
      : 'Microsoft fit needs an Azure, Microsoft, or program-status signal.',
  });
}

function postureProjection(snapshot) {
  const fields = ['handles_personal_data', 'data_sensitivity', 'has_backup', 'pen_test_completed'];
  const claims = fields.map((field) => claim(snapshot, field)).filter(Boolean);
  const riskSignals = ['handles_personal_data', 'data_sensitivity'].filter((field) => hasClaim(snapshot, field));
  const controlSignals = ['has_backup', 'pen_test_completed'].filter((field) => hasClaim(snapshot, field));
  const state = claims.length >= 3 ? 'partial' : claims.length >= 1 ? 'emerging' : 'unknown';
  return projection({
    key: 'posture',
    title: 'Posture',
    state,
    confidence: riskSignals.length && controlSignals.length ? 'medium' : 'low',
    claims,
    observations: observationsFor(snapshot, fields),
    missing_inputs: fields.filter((field) => !hasClaim(snapshot, field)),
    explanation: claims.length
      ? 'Security posture is forming from data-risk and control signals.'
      : 'Security posture needs data-risk or control signals.',
  });
}

function spvProjection(snapshot) {
  const fields = ['company_name', 'website', 'stage', 'sector', 'revenue', 'team_size'];
  const claims = fields.map((field) => claim(snapshot, field)).filter(Boolean);
  const state = claims.length >= 4 ? 'emerging' : claims.length >= 2 ? 'forming' : 'unknown';
  return projection({
    key: 'spv',
    title: 'Company Profile',
    state,
    confidence: claims.length >= 5 ? 'medium' : 'low',
    claims,
    observations: observationsFor(snapshot, fields),
    missing_inputs: fields.filter((field) => !hasClaim(snapshot, field)),
    explanation: claims.length
      ? 'The private Company Profile is reconstructing from durable memory.'
      : 'The private Company Profile needs identity and operating signals.',
  });
}

export function buildProfileProjections(snapshot) {
  const projections = {
    investor: investorProjection(snapshot),
    vendors: vendorsProjection(snapshot),
    aws: awsProjection(snapshot),
    microsoft: microsoftProjection(snapshot),
    posture: postureProjection(snapshot),
    spv: spvProjection(snapshot),
  };

  return {
    profile_id: snapshot.profile.id,
    reconstructed_at: snapshot.reconstructed_at,
    projections,
    lit_tiles: Object.fromEntries(
      PROJECTION_KEYS.map((key) => [
        key,
        !['unknown', 'blocked'].includes(projections[key].state),
      ])
    ),
  };
}

export const _internals = {
  PROJECTION_KEYS,
  investorProjection,
  vendorsProjection,
  awsProjection,
  microsoftProjection,
  postureProjection,
  spvProjection,
};
