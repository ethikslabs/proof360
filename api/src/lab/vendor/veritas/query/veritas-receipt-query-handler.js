import { claimStatus, getReceipt, listDowngrades, verifyReceipt, } from "./query-surface.js";
import { toCustomerFacingVerification, } from "./verification.js";
export class ReceiptNotFoundError extends Error {
    constructor(receiptId) {
        super(`Receipt not found: ${receiptId}`);
        this.name = "ReceiptNotFoundError";
    }
}
export class VeritasReceiptQueryHandler {
    store;
    constructor(store) {
        this.store = store;
    }
    async handleClaimStatus(claim_ref) {
        const status = await claimStatus(claim_ref, this.store);
        if (status === null)
            return null;
        const result = await verifyReceipt(status.receipt.receipt_id, this.store);
        return toCustomerFacingVerification(result, status.receipt);
    }
    async handleVerifyReceipt(receipt_id) {
        const receipt = await getReceipt(receipt_id, this.store);
        if (receipt === null) {
            throw new ReceiptNotFoundError(receipt_id);
        }
        const result = await verifyReceipt(receipt_id, this.store);
        return toCustomerFacingVerification(result, receipt);
    }
    async handleListDowngrades(source_id) {
        return listDowngrades(source_id, this.store);
    }
}
