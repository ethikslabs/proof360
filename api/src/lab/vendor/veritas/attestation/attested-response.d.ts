import type { AttestationState } from "../types.js";
export interface AttestedResponse<T> {
    payload: T;
    attestation: {
        state: AttestationState;
        proof_path_id: string | null;
        corpus_refs: string[];
        attested_at: string;
        veritas_version: string;
    };
    receipt_id: string;
}
/** Customer-safe output — internal fields excluded */
export interface CustomerFacingAttestedResponse<T> {
    payload: T;
    state: AttestationState;
    receipt_id: string;
}
/**
 * Validates an AttestedResponse against state-specific rules.
 * - "Attested" → proof_path_id must be non-null string, corpus_refs must have ≥1 entry
 * - "Inferred" → proof_path_id must be non-null string
 * - "Unknown"  → always passes
 */
export declare function validate<T>(response: AttestedResponse<T>): {
    valid: true;
} | {
    valid: false;
    error: string;
};
/**
 * Serializes an AttestedResponse to a JSON string.
 * Internal/product-service wire format — no leak gradient checks.
 */
export declare function serialize<T>(response: AttestedResponse<T>): string;
/**
 * Deserializes a JSON string into an AttestedResponse.
 * Throws on invalid JSON or failed validation.
 */
export declare function deserialize<T>(json: string): AttestedResponse<T>;
/**
 * Renders a CustomerFacingAttestedResponse from an AttestedResponse.
 * Strips internal fields (corpus_refs, proof_path_id, veritas_version, attested_at).
 * If renderPayload is provided, calls it to transform the payload.
 * Calls checkForLeaks on all string values in the output; throws if any forbidden term found.
 */
export declare function toCustomerFacing<T>(response: AttestedResponse<T>, renderPayload?: (payload: T) => unknown): CustomerFacingAttestedResponse<T>;
