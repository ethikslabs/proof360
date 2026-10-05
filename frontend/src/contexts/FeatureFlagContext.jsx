import { createContext, useContext, useState, useEffect } from 'react';
import { getFeatures } from '../api/client.js';

/**
 * Safe defaults used when the /api/features endpoint is unreachable.
 * Keeps pre-overnight-v1 behaviour intact while disabling all new features.
 *
 * - surfaces: only founder + admin true (pre-existing personas)
 * - layer2_cards: only vendor_route true (pre-existing card)
 * - cold_read: all false (new overnight-v1 features disabled)
 */
export const SAFE_DEFAULTS = { // eslint-disable-line react-refresh/only-export-components
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
    program_match: false,
    risk_heatmap: false,
    vendor_route: true,
    quote: false,
  },
  cold_read: {
    shareable_url: false,
    preread_tool: false,
  },
};

// `loaded` is false until the /api/features fetch settles (resolve OR reject). Consumers
// that gate on a flag being false — e.g. AdminPreread's redirect — must wait for `loaded`,
// or they act on SAFE_DEFAULTS and redirect before the API can say the feature is on.
const FeatureFlagContext = createContext({ ...SAFE_DEFAULTS, loaded: false });

export function FeatureFlagProvider({ children }) {
  const [features, setFeatures] = useState(SAFE_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFeatures()
      .then((data) => {
        if (!cancelled) setFeatures(data);
      })
      .catch(() => {
        // Fetch failed — keep safe defaults (already set as initial state)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ ...features, loaded }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() { // eslint-disable-line react-refresh/only-export-components
  return useContext(FeatureFlagContext);
}
