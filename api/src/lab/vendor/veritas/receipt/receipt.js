import { VERITAS_HASH_ALGORITHM, VERITAS_RECEIPT_SCHEMA_VERSION, } from "../types.js";
import { validate } from "../attestation/index.js";
import { computeEventHash, computeReceiptHash } from "../integrity/index.js";
import { checkForLeaks } from "../leak-gradient/index.js";
function requireNonEmpty(value, fallback) {
    const candidate = value?.trim();
    return candidate && candidate.length > 0 ? candidate : fallback;
}
function evidenceRefsFromWitnesses(witnessedBy, observedAt) {
    return witnessedBy.map((source) => ({
        evidence_id: source.source_id,
        evidence_type: "source_ref",
        source_id: source.source_id,
        display_label: source.display_label,
        source_state: source.source_state,
        reference: source.source_id,
        observed_at: observedAt,
    }));
}
function withOptionalReceiptFields(receipt, input) {
    if (input.confidence !== undefined) {
        receipt.confidence = input.confidence;
    }
    if (input.sensitivity !== undefined) {
        receipt.sensitivity = input.sensitivity;
    }
    return receipt;
}
/**
 * Creates a Receipt from a CreateReceiptInput.
 * Accepts AttestedResponse with any state including "Unknown".
 * Rejects UnattestedResponse (runtime check: unattested === true).
 * Validates the attestation envelope and verifies proof path consistency.
 */
export function createReceipt(input) {
    // Runtime guard: reject UnattestedResponse
    if (input.response.unattested === true) {
        throw new Error("Cannot create receipt from UnattestedResponse");
    }
    // Validate the attestation envelope — defence-in-depth for deserialized/JS callers
    const validationResult = validate(input.response);
    if (!validationResult.valid) {
        throw new Error(`Cannot create receipt from invalid AttestedResponse: ${validationResult.error}`);
    }
    // Verify proof path consistency: receipt.verifies must match the attestation proof path
    // when the attestation carries a non-null proof_path_id.
    // Unknown attestations carry no proof path and must not fabricate one.
    const attestedProofPathId = input.response.attestation.proof_path_id;
    if (attestedProofPathId === null && input.verifies !== null) {
        throw new Error("Unknown attestation cannot verify a proof path");
    }
    if (attestedProofPathId !== null && input.verifies === null) {
        throw new Error("Proof path required for Attested or Inferred receipt");
    }
    if (attestedProofPathId !== null && input.verifies.proof_path_id !== attestedProofPathId) {
        throw new Error(`Proof path mismatch: receipt verifies "${input.verifies.proof_path_id}" but attestation references "${attestedProofPathId}"`);
    }
    const receivedAt = input.received_at ?? new Date().toISOString();
    const issuer = requireNonEmpty(input.issuer, "veritas");
    const subject = requireNonEmpty(input.subject, input.claim);
    const claimType = requireNonEmpty(input.claim_type, "claim.text");
    const evidenceRefs = input.evidence_refs ?? evidenceRefsFromWitnesses(input.witnessed_by, input.verifies?.attested_at ?? receivedAt);
    const issuedEvent = {
        event_type: "issued",
        occurred_at: receivedAt,
        detail: "Receipt issued",
        actor_id: requireNonEmpty(input.actor_id, issuer),
        outcome: "issued",
        previous_event_hash: null,
    };
    if (input.event_source !== undefined) {
        issuedEvent.source = input.event_source;
    }
    issuedEvent.event_hash = computeEventHash(issuedEvent);
    const receipt = withOptionalReceiptFields({
        receipt_id: input.response.receipt_id,
        receipt_schema_version: VERITAS_RECEIPT_SCHEMA_VERSION,
        claim: input.claim,
        claim_type: claimType,
        state: input.response.attestation.state,
        issuer,
        subject,
        witnessed_by: input.witnessed_by,
        evidence_refs: evidenceRefs,
        received_at: receivedAt,
        verifies: input.verifies,
        tenant_id: input.tenant_id ?? null,
        events: [issuedEvent],
        veritas_version: input.response.attestation.veritas_version,
        hash_algorithm: VERITAS_HASH_ALGORITHM,
    }, input);
    receipt.receipt_hash = computeReceiptHash(receipt);
    return receipt;
}
/**
 * Appends an event to a receipt, returning a NEW Receipt.
 * The original receipt is never mutated.
 */
export function appendEvent(receipt, event) {
    const previous = receipt.events.at(-1);
    const appended = {
        ...event,
        actor_id: event.actor_id ?? receipt.issuer ?? "veritas",
        outcome: event.outcome ?? event.event_type,
        previous_event_hash: previous?.event_hash ?? null,
    };
    appended.event_hash = computeEventHash(appended);
    return {
        ...receipt,
        witnessed_by: [...receipt.witnessed_by],
        evidence_refs: receipt.evidence_refs === undefined
            ? undefined
            : receipt.evidence_refs.map((ref) => ({ ...ref })),
        verifies: receipt.verifies === null ? null : { ...receipt.verifies },
        events: [...receipt.events, appended],
    };
}
/**
 * Serializes a Receipt to a JSON string.
 * Internal wire format — no leak gradient checks.
 */
export function serialize(receipt) {
    return JSON.stringify(receipt);
}
/**
 * Deserializes a JSON string into a Receipt.
 * Throws on invalid JSON.
 */
export function deserialize(json) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        throw new Error("Failed to parse Receipt JSON: invalid JSON");
    }
    // Basic structural validation
    if (typeof parsed.receipt_id !== "string" ||
        typeof parsed.claim !== "string" ||
        !Array.isArray(parsed.events)) {
        throw new Error("Failed to validate deserialized Receipt: missing or invalid fields");
    }
    return parsed;
}
/**
 * Collects all string values from an unknown structure recursively.
 */
function collectStringValues(value) {
    if (typeof value === "string")
        return [value];
    if (Array.isArray(value))
        return value.flatMap(collectStringValues);
    if (value !== null && typeof value === "object") {
        return Object.values(value).flatMap(collectStringValues);
    }
    return [];
}
/**
 * Renders a CustomerFacingReceipt from a Receipt.
 * Calls checkForLeaks on ALL string values; throws on leak.
 */
export function toCustomerFacing(receipt) {
    const output = {
        receipt_id: receipt.receipt_id,
        claim: receipt.claim,
        state: receipt.state,
        witnessed_by: receipt.witnessed_by.map((w) => ({
            display_label: w.display_label,
            source_state: w.source_state,
        })),
        received_at: receipt.received_at,
        verifies: receipt.verifies === null
            ? null
            : {
                proof_path_id: receipt.verifies.proof_path_id,
                attested_at: receipt.verifies.attested_at,
            },
        events: receipt.events.map((e) => ({
            event_type: e.event_type,
            occurred_at: e.occurred_at,
            detail: e.detail,
        })),
    };
    // Check all string values for leaks
    const allStrings = collectStringValues(output);
    for (const str of allStrings) {
        const leaks = checkForLeaks(str);
        if (leaks.length > 0) {
            const details = leaks
                .map((l) => `"${l.term}" at position ${l.position}`)
                .join(", ");
            throw new Error(`Leak gradient violation in customer-facing receipt: ${details}`);
        }
    }
    return output;
}
