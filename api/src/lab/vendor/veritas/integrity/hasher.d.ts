import type { ReceiptEvent } from "../types.js";
import type { Receipt } from "../receipt/index.js";
/** Computes a SHA-256 hex digest of a canonical JSON string. */
export declare function sha256(input: string): string;
/** Computes the receipt_hash from a receipt's canonical header. */
export declare function computeReceiptHash(receipt: Receipt): string;
/** Computes the event_hash from an event's canonical content. */
export declare function computeEventHash(event: ReceiptEvent): string;
