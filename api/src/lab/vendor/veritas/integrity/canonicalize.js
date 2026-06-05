function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (!isPlainObject(value)) {
        return value;
    }
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
        sorted[key] = sortValue(value[key]);
    }
    return sorted;
}
function assertReceipt(receipt) {
    if (typeof receipt.receipt_id !== "string" ||
        typeof receipt.claim !== "string" ||
        typeof receipt.state !== "string" ||
        !Array.isArray(receipt.witnessed_by) ||
        typeof receipt.received_at !== "string" ||
        typeof receipt.veritas_version !== "string") {
        throw new Error("Invalid receipt structure for canonicalization");
    }
}
function assertReceiptEvent(event) {
    if (typeof event.event_type !== "string" ||
        typeof event.occurred_at !== "string" ||
        typeof event.detail !== "string") {
        throw new Error("Invalid receipt event structure for canonicalization");
    }
}
function withDefinedFields(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
/**
 * Produces canonical JSON with sorted keys at all nesting levels and no
 * extraneous whitespace. Arrays preserve their original order.
 */
export function canonicalize(value) {
    return JSON.stringify(sortValue(value));
}
/**
 * Canonicalizes receipt header fields only. Event data and receipt_hash are
 * excluded because event integrity is verified by the event chain.
 */
export function canonicalizeReceipt(receipt) {
    assertReceipt(receipt);
    return canonicalize(withDefinedFields({
        receipt_id: receipt.receipt_id,
        receipt_schema_version: receipt.receipt_schema_version,
        claim: receipt.claim,
        claim_type: receipt.claim_type,
        state: receipt.state,
        issuer: receipt.issuer,
        subject: receipt.subject,
        witnessed_by: receipt.witnessed_by,
        evidence_refs: receipt.evidence_refs,
        received_at: receipt.received_at,
        verifies: receipt.verifies,
        confidence: receipt.confidence,
        tenant_id: receipt.tenant_id,
        sensitivity: receipt.sensitivity,
        veritas_version: receipt.veritas_version,
        hash_algorithm: receipt.hash_algorithm,
    }));
}
/**
 * Canonicalizes event content only. Hash fields are excluded to avoid a
 * circular dependency while computing event_hash.
 */
export function canonicalizeEvent(event) {
    assertReceiptEvent(event);
    return canonicalize(withDefinedFields({
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        detail: event.detail,
        actor_id: event.actor_id,
        outcome: event.outcome,
        source: event.source,
    }));
}
