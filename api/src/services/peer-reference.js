// The absence register, in John's own register (CANON-hx-loop R6, 2026-09-13:
// "This is how I speak in human"):
//
//   Companies like yours usually go for X to achieve Z, and use Y to get there.
//   We didn't see one on your pages. Do you have it?
//
// Every slot is derived, nothing invented:
//   like yours  — the OBSERVED customer type, mapped to a frameworks cohort; if it
//                 was not observed (or has no defensible cohort) there is no line
//   X           — the gap's authored `peer.framework` when the cohort's frameworks
//                 map includes it (a cohort that does not usually go for it gets no
//                 line), or the gap's authored `peer.pursue`
//   Y           — the first partner vendor in the catalog that closes the gap, stake
//                 disclosed; a non-partner if no partner closes it
//   Z           — the gap's authored `peer.outcome`, lamp register
// "usually" is the ceiling; "need", "your gap", "you lack" never appear.
import { GAP_DEFINITIONS } from '../config/gaps.js';
import { FRAMEWORK_MAP } from '../config/frameworks.js';
import { VENDORS } from '../config/vendors.js';
import { CUSTOMER_TYPE_TO_FRAMEWORK_KEY, FRAMEWORK_LABELS } from './cold-reading.js';

function vendorFor(gapId) {
  const closers = Object.values(VENDORS).filter((v) => Array.isArray(v.closes) && v.closes.includes(gapId));
  if (!closers.length) return null;
  const v = closers.find((c) => c.is_partner === true) || closers[0];
  const stake = v.is_partner === true
    ? ` (an EthiksLabs partner${v.deal_label ? `, ${v.deal_label}` : ''})`
    : '';
  return `${v.display_name}${stake}`;
}

export function peerReference(gapId, ctx = {}) {
  const gap = GAP_DEFINITIONS.find((g) => g.id === gapId);
  if (!gap || !gap.peer) return null;

  const cohort = CUSTOMER_TYPE_TO_FRAMEWORK_KEY[ctx.customer_type];
  if (!cohort) return null; // "like yours" is never invented

  let pursuit;
  if (gap.peer.framework) {
    const usual = FRAMEWORK_MAP[cohort] || [];
    if (!usual.includes(gap.peer.framework)) return null; // this cohort does not usually go for it
    pursuit = FRAMEWORK_LABELS[gap.peer.framework] || gap.peer.framework;
  } else if (gap.peer.pursue) {
    pursuit = gap.peer.pursue;
  } else {
    return null;
  }

  const vendor = vendorFor(gapId);
  const path = vendor ? `, and use ${vendor} to get there` : '';
  const outcome = gap.peer.outcome ? ` ${gap.peer.outcome}` : '';
  const thing = gap.peer.framework ? 'it' : 'one';
  return `Companies like yours usually go for ${pursuit}${outcome}${path}. We didn't see one on your pages. Do you have ${thing}?`;
}
