import { checkForLeaks } from "../leak-gradient/index.js";
/**
 * Validates an AttestedResponse against state-specific rules.
 * - "Attested" → proof_path_id must be non-null string, corpus_refs must have ≥1 entry
 * - "Inferred" → proof_path_id must be non-null string
 * - "Unknown"  → always passes
 */
export function validate(response) {
    const { state, proof_path_id, corpus_refs } = response.attestation;
    // Reject unknown states at the wire boundary
    const VALID_STATES = ["Attested", "Inferred", "Unknown"];
    if (!VALID_STATES.includes(state)) {
        return {
            valid: false,
            error: `Invalid attestation state "${state}": must be one of Attested, Inferred, Unknown`,
        };
    }
    if (state === "Attested") {
        if (typeof proof_path_id !== "string" || proof_path_id.trim() === "") {
            return {
                valid: false,
                error: 'Attested state requires proof_path_id to be a non-empty string',
            };
        }
        if (!Array.isArray(corpus_refs) || corpus_refs.length < 1) {
            return {
                valid: false,
                error: 'Attested state requires corpus_refs to contain at least one entry',
            };
        }
    }
    if (state === "Inferred") {
        if (typeof proof_path_id !== "string" || proof_path_id.trim() === "") {
            return {
                valid: false,
                error: 'Inferred state requires proof_path_id to be a non-empty string',
            };
        }
    }
    return { valid: true };
}
/**
 * Serializes an AttestedResponse to a JSON string.
 * Internal/product-service wire format — no leak gradient checks.
 */
export function serialize(response) {
    return JSON.stringify(response);
}
/**
 * Deserializes a JSON string into an AttestedResponse.
 * Throws on invalid JSON or failed validation.
 */
export function deserialize(json) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        throw new Error(`Failed to parse AttestedResponse JSON: invalid JSON`);
    }
    const result = validate(parsed);
    if (!result.valid) {
        throw new Error(`Failed to validate deserialized AttestedResponse: ${result.error}`);
    }
    return parsed;
}
/**
 * Collects all string values from an unknown structure (shallow for primitives,
 * recursive for objects/arrays).
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
 * Renders a CustomerFacingAttestedResponse from an AttestedResponse.
 * Strips internal fields (corpus_refs, proof_path_id, veritas_version, attested_at).
 * If renderPayload is provided, calls it to transform the payload.
 * Calls checkForLeaks on all string values in the output; throws if any forbidden term found.
 */
export function toCustomerFacing(response, renderPayload) {
    const renderedPayload = renderPayload
        ? renderPayload(response.payload)
        : response.payload;
    const output = {
        payload: renderedPayload,
        state: response.attestation.state,
        receipt_id: response.receipt_id,
    };
    // Collect ALL string values to check for leaks — always recursive,
    // regardless of whether renderPayload was supplied.
    const stringsToCheck = collectStringValues(output);
    for (const str of stringsToCheck) {
        const leaks = checkForLeaks(str);
        if (leaks.length > 0) {
            const details = leaks
                .map((l) => `"${l.term}" at position ${l.position}`)
                .join(", ");
            throw new Error(`Leak gradient violation in customer-facing output: ${details}`);
        }
    }
    return output;
}
