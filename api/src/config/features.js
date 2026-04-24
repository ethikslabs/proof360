// Feature flag configuration — gates UI surfaces, Layer 2 cards, and cold read features.
// Edit this file to enable/disable features. Served via GET /api/features.

export const FEATURES = {
  surfaces: {
    founder: true,
    buyer: false,
    investor: false,
    broker: false,
    aws_seller: false,
    distributor: false,
    admin: true,
  },
  layer2_cards: {
    program_match: true,
    risk_heatmap: false,
    vendor_route: true,
    quote: false,
  },
  cold_read: {
    shareable_url: true,
    preread_tool: true,
  },
};
