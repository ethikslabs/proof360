export const EMPTY_TILES = {
  investor: false,
  vendors: false,
  aws: false,
  microsoft: false,
  posture: false,
  spv: false,
};

const TILE_ALIASES = {
  investor: ['investor', 'investor_readiness'],
  vendors: ['vendors', 'vendor', 'vendor_readiness', 'vendor_fit'],
  aws: ['aws', 'aws_activate', 'aws_programs'],
  microsoft: ['microsoft', 'msft', 'microsoft_founders_hub', 'microsoft_programs'],
  posture: ['posture', 'security', 'security_posture'],
  spv: ['spv', 'profile', 'company_profile', 'memory', 'memory_kernel'],
};

const DARK_STATES = new Set(['unknown', 'blocked', 'not_applicable', 'none', 'empty']);

function projectionState(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.state ?? value.status ?? value.readiness ?? null;
}

function normalizeProjectionMap(projections) {
  if (!projections) return {};
  if (Array.isArray(projections)) {
    return Object.fromEntries(
      projections
        .map(p => [p.id ?? p.key ?? p.kind ?? p.type ?? p.name, p])
        .filter(([key]) => key)
    );
  }
  return projections.projections ?? projections.tiles ?? projections;
}

export function tilesFromProjections(projections) {
  const source = normalizeProjectionMap(projections);
  const tiles = { ...EMPTY_TILES };

  for (const [tile, aliases] of Object.entries(TILE_ALIASES)) {
    const projection = aliases.map(alias => source[alias]).find(Boolean);
    const state = projectionState(projection);
    tiles[tile] = state !== null && state !== undefined && !DARK_STATES.has(String(state).toLowerCase());
  }

  return tiles;
}
