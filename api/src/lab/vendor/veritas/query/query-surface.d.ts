import type { ReceiptStore } from "../downgrade/index.js";
import type { Receipt } from "../receipt/index.js";
import type { AttestationState } from "../types.js";
import type { DowngradeEvent, VerificationResult } from "./verification.js";
/** Retrieves a single receipt with its full event chain. */
export declare function getReceipt(receipt_id: string, store: ReceiptStore): Promise<Receipt | null>;
/** Verifies receipt header integrity and the append-only event chain. */
export declare function verifyReceipt(receipt_id: string, store: ReceiptStore): Promise<VerificationResult>;
/** Returns the latest receipt state for a claim. */
export declare function claimStatus(claim: string, store: ReceiptStore): Promise<{
    state: AttestationState;
    receipt: Receipt;
} | null>;
/** Lists all receipts referencing the given source_id. */
export declare function listReceiptsBySource(source_id: string, store: ReceiptStore): Promise<Receipt[]>;
/** Lists all downgrade events for receipts referencing the given source_id. */
export declare function listDowngrades(source_id: string, store: ReceiptStore): Promise<DowngradeEvent[]>;
