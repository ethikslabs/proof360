import { createHash } from "node:crypto";
import { canonicalizeEvent, canonicalizeReceipt } from "./canonicalize.js";
/** Computes a SHA-256 hex digest of a canonical JSON string. */
export function sha256(input) {
    return createHash("sha256").update(input, "utf8").digest("hex");
}
/** Computes the receipt_hash from a receipt's canonical header. */
export function computeReceiptHash(receipt) {
    return sha256(canonicalizeReceipt(receipt));
}
/** Computes the event_hash from an event's canonical content. */
export function computeEventHash(event) {
    return sha256(canonicalizeEvent(event));
}
