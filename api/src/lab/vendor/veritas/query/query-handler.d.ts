import type { CustomerFacingVerification, DowngradeEvent } from "./verification.js";
/**
 * Contract for how CONTROL/IMPERIUM will call VERITAS query functions.
 */
export interface VeritasQueryHandler {
    handleClaimStatus(claim_ref: string): Promise<CustomerFacingVerification | null>;
    handleVerifyReceipt(receipt_id: string): Promise<CustomerFacingVerification>;
    handleListDowngrades(source_id: string): Promise<DowngradeEvent[]>;
}
