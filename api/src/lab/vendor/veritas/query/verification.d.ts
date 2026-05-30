import type { AttestationState, HashAlgorithm, ReceiptSchemaVersion, ReceiptSensitivity } from "../types.js";
import type { Receipt } from "../receipt/index.js";
export type ViolationType = "receipt_header_hash_mismatch" | "event_hash_mismatch" | "chain_break" | "missing_receipt";
export interface Violation {
    type: ViolationType;
    message: string;
    event_index?: number;
}
export type VerificationResult = {
    verified: true;
} | {
    verified: false;
    violations: Violation[];
};
export interface CustomerFacingVerification {
    receipt_id: string;
    receipt_schema_version?: ReceiptSchemaVersion;
    claim?: string;
    claim_type?: string;
    issuer?: string;
    subject?: string;
    verified: boolean;
    state: AttestationState;
    received_at: string;
    attested_at?: string | null;
    witnessed_by?: Array<{
        display_label: string;
        source_state: "current" | "downgraded";
    }>;
    confidence?: number;
    sensitivity?: ReceiptSensitivity;
    hash_algorithm?: HashAlgorithm;
}
export interface DowngradeEvent {
    receipt_id: string;
    event_type: string;
    occurred_at: string;
    detail: string;
}
/**
 * Renders a verification result safe for customer surfaces.
 * Raw hashes, source ids, event details, and violation internals are stripped.
 */
export declare function toCustomerFacingVerification(result: VerificationResult, receipt: Receipt): CustomerFacingVerification;
