import type { ReceiptStore } from "../downgrade/index.js";
import type { VeritasQueryHandler } from "./query-handler.js";
import { type CustomerFacingVerification, type DowngradeEvent } from "./verification.js";
export declare class ReceiptNotFoundError extends Error {
    constructor(receiptId: string);
}
export declare class VeritasReceiptQueryHandler implements VeritasQueryHandler {
    private store;
    constructor(store: ReceiptStore);
    handleClaimStatus(claim_ref: string): Promise<CustomerFacingVerification | null>;
    handleVerifyReceipt(receipt_id: string): Promise<CustomerFacingVerification>;
    handleListDowngrades(source_id: string): Promise<DowngradeEvent[]>;
}
