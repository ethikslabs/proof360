// One breakpoint hook, three states, one source of truth.
//
// What was here before (Chat.jsx): `useState(() => window.innerWidth < 768)` plus a
// bare resize listener, and a whole second component tree (MobileAuthorityLayer) for
// the narrow case. Two consequences. First, one hard binary — the rail is 240px from
// 768px to 4K and never participates, so the state John actually wanted (rail folds to
// tabs, everything else stays) did not exist at any width. Second, the mobile chrome
// drifted: it carries its own palette and its own copy of the §4 demo label, so a fix
// to one silently misses the other.
//
// Three states instead, named for what the LAYOUT does rather than for a device —
// a 900px browser window on a desktop is 'compact', and calling that "mobile" is how
// layouts end up lying about who is looking at them.
import { useEffect, useState } from 'react';

// Values are taken from published design-system tokens, not guessed. The convergence
// across systems is unambiguous: ~768px is where a persistent rail must go away, and
// ~1024-1056px is where one becomes affordable again.
//   IBM Carbon  md 672 · lg 1056 · xlg 1312   (42rem / 66rem — Carbon is rem-based)
//   Polaris     md 768 · lg 1040 · xl 1440
//   Tailwind v4 md 768 · lg 1024 · xl 1280
//   Atlassian   s 768-1023 · m 1024-1439
//   Material 3  compact <600 · medium 600-839 · expanded 840-1199 · large 1200+
//
// We take Carbon's 1056 for the rail boundary (the most conservative of the cluster —
// a rail that only just fits is a rail that crowds the reading) and 768 for the point
// the rail must leave. Named for what the LAYOUT does, never for a device: a 900px
// browser window on a desktop is 'medium', and calling that "mobile" is how a layout
// ends up lying about who is looking at it. Material 3 and Atlassian both moved to
// capacity classes for exactly this reason.
export const BREAKPOINT = {
  compact: 768,    // below: one column, tabs, no rail
  medium: 1056,    // below: tabs + full-width reading; at/above: the rail returns
};

function classify(width) {
  if (width < BREAKPOINT.compact) return 'compact';
  if (width < BREAKPOINT.medium) return 'medium';
  return 'expanded';
}

/**
 * Returns { width, size, isCompact, isMedium, isExpanded, hasRail }.
 *
 * `hasRail` is the only thing most callers need: it answers "is the persistent rail
 * on screen, or has it folded into tabs?" — which is the actual layout question, and
 * keeps call sites from re-deriving it from a pixel number apiece.
 */
export function useBreakpoint() {
  const [width, setWidth] = useState(
    () => (typeof window === 'undefined' ? BREAKPOINT.medium : window.innerWidth),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // matchMedia rather than a resize listener: it fires only when a boundary is
    // actually crossed, so dragging a window edge does not re-render on every pixel.
    const queries = [
      window.matchMedia(`(max-width: ${BREAKPOINT.compact - 1}px)`),
      window.matchMedia(`(max-width: ${BREAKPOINT.medium - 1}px)`),
    ];
    const onChange = () => setWidth(window.innerWidth);
    for (const q of queries) q.addEventListener('change', onChange);
    onChange();   // in case the first paint was measured before hydration
    return () => { for (const q of queries) q.removeEventListener('change', onChange); };
  }, []);

  const size = classify(width);
  return {
    width,
    size,
    isCompact:  size === 'compact',
    isMedium:   size === 'medium',
    isExpanded: size === 'expanded',
    hasRail:    size === 'expanded',
  };
}

/**
 * The rail's collapsed/expanded state is a USER PREFERENCE; the width class is
 * COMPUTED. Keeping them in one variable is the bug that makes rails "forget" what you
 * chose after you resize the window — crossing a boundary overwrites the choice.
 * Atlassian states the related rule outright: breakpoints track viewport width, and
 * showing or hiding a panel must never change which breakpoint you are in (compute
 * from a container the sidebar itself resizes and you get oscillation at the edge).
 *
 * So: `hasRail` says whether a rail can exist at this width at all; `railOpen` says
 * whether the person wants it open when it can. Below the boundary the preference is
 * carried untouched, not reset.
 */
export function useRailState(preference, setPreference) {
  const bp = useBreakpoint();
  return {
    ...bp,
    railOpen: bp.hasRail && preference !== false,
    setRailOpen: setPreference,
  };
}

export default useBreakpoint;
