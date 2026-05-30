/** The three valid VERITAS attestation states */
export type AttestationState = "Attested" | "Inferred" | "Unknown";
export declare const VERITAS_RECEIPT_SCHEMA_VERSION: "veritas.receipt.v1";
export declare const VERITAS_HASH_ALGORITHM: "sha256";
export type ReceiptSchemaVersion = string;
export type HashAlgorithm = string;
export type ReceiptSensitivity = "public" | "internal" | "confidential" | "restricted";
/** Reference to a witness or evidence source */
export interface SourceRef {
    source_id: string;
    display_label: string;
    source_state: "current" | "downgraded";
}
/** A reference chain linking a claim to supporting evidence */
export interface ProofPath {
    proof_path_id: string;
    attested_at: string;
}
/** Internal evidence reference; customer-safe output projects this to witnessed_by */
export interface EvidenceRef {
    evidence_id: string;
    evidence_type: string;
    source_id?: string;
    display_label?: string;
    source_state?: "current" | "downgraded";
    reference?: string;
    observed_at?: string;
    hash?: string;
    hash_algorithm?: HashAlgorithm;
    source_system?: string;
}
/** Known receipt event types for this slice */
export type ReceiptEventType = "issued" | "source_quality_fell" | "claim_revised" | "downgraded";
/** Immutable event entry in a receipt's event log */
export interface ReceiptEvent {
    event_type: ReceiptEventType;
    occurred_at: string;
    detail: string;
    actor_id?: string;
    outcome?: string;
    source?: string;
    event_hash?: string;
    previous_event_hash?: string | null;
}
/** Typed caller identity for operator-only functions */
export interface OperatorIdentity {
    caller_id: string;
}
/** Known operator scope literals for VERITAS-002 auth scaffold */
export type OperatorScope = "raw_read" | "downgrade" | "migrate";
/** Operator token for authenticated access (scaffold only — no real crypto) */
export interface OperatorToken {
    caller_id: string;
    issued_at: string;
    expires_at: string;
    scope: OperatorScope[];
}
/** Validation result for operator tokens */
export type TokenValidationResult = {
    valid: true;
    caller_id: string;
} | {
    valid: false;
    error: string;
};
/** Options for corpusRawRead */
export interface RawReadOptions {
    reason?: string;
    request_id?: string;
}
