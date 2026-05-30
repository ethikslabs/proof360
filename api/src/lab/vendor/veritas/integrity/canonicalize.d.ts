import type { ReceiptEvent } from "../types.js";
import type { Receipt } from "../receipt/index.js";
/**
 * Produces canonical JSON with sorted keys at all nesting levels and no
 * extraneous whitespace. Arrays preserve their original order.
 */
export declare function canonicalize(value: unknown): string;
/**
 * Canonicalizes receipt header fields only. Event data and receipt_hash are
 * excluded because event integrity is verified by the event chain.
 */
export declare function canonicalizeReceipt(receipt: Receipt): string;
/**
 * Canonicalizes event content only. Hash fields are excluded to avoid a
 * circular dependency while computing event_hash.
 */
export declare function canonicalizeEvent(event: ReceiptEvent): string;
