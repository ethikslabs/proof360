import type { AttestationState, EvidenceRef, HashAlgorithm, ReceiptSchemaVersion, ReceiptSensitivity, SourceRef, ProofPath, ReceiptEvent, ReceiptEventType } from "../types.js";
import type { AttestedResponse } from "../attestation/index.js";
export interface Receipt {
    receipt_id: string;
    receipt_schema_version?: ReceiptSchemaVersion;
    claim: string;
    claim_type?: string;
    state: AttestationState;
    issuer?: string;
    subject?: string;
    witnessed_by: SourceRef[];
    evidence_refs?: EvidenceRef[];
    received_at: string;
    verifies: ProofPath | null;
    confidence?: number;
    tenant_id?: string | null;
    sensitivity?: ReceiptSensitivity;
    events: ReceiptEvent[];
    veritas_version: string;
    hash_algorithm?: HashAlgorithm;
    receipt_hash?: string;
}
export interface CustomerFacingReceipt {
    receipt_id: string;
    claim: string;
    state: AttestationState;
    witnessed_by: Array<{
        display_label: string;
        source_state: "current" | "downgraded";
    }>;
    received_at: string;
    verifies: {
        proof_path_id: string;
        attested_at: string;
    } | null;
    events: Array<{
        event_type: ReceiptEventType;
        occurred_at: string;
        detail: string;
    }>;
}
export interface CreateReceiptInput {
    response: AttestedResponse<unknown>;
    claim: string;
    claim_type?: string;
    issuer?: string;
    subject?: string;
    witnessed_by: SourceRef[];
    evidence_refs?: EvidenceRef[];
    verifies: ProofPath | null;
    confidence?: number;
    tenant_id?: string | null;
    sensitivity?: ReceiptSensitivity;
    received_at?: string;
    actor_id?: string;
    event_source?: string;
}
/**
 * Creates a Receipt from a CreateReceiptInput.
 * Accepts AttestedResponse with any state including "Unknown".
 * Rejects UnattestedResponse (runtime check: unattested === true).
 * Validates the attestation envelope and verifies proof path consistency.
 */
export declare function createReceipt(input: CreateReceiptInput): Receipt;
/**
 * Appends an event to a receipt, returning a NEW Receipt.
 * The original receipt is never mutated.
 */
export declare function appendEvent(receipt: Receipt, event: ReceiptEvent): Receipt;
/**
 * Serializes a Receipt to a JSON string.
 * Internal wire format — no leak gradient checks.
 */
export declare function serialize(receipt: Receipt): string;
/**
 * Deserializes a JSON string into a Receipt.
 * Throws on invalid JSON.
 */
export declare function deserialize(json: string): Receipt;
/**
 * Renders a CustomerFacingReceipt from a Receipt.
 * Calls checkForLeaks on ALL string values; throws on leak.
 */
export declare function toCustomerFacing(receipt: Receipt): CustomerFacingReceipt;
