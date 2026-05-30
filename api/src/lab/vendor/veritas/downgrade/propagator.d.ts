import type { ReceiptEvent } from "../types.js";
import type { Receipt } from "../receipt/index.js";
import type { OperatorToken } from "../types.js";
export interface SourceDowngrade {
    source_id: string;
    previous_state: "current";
    new_state: "downgraded";
    timestamp: string;
}
export interface PropagationResult {
    affected_receipt_ids: string[];
    already_downgraded_receipt_ids: string[];
    appended_events: ReceiptEvent[];
}
export interface ReceiptStore {
    findBySource(source_id: string): Receipt[] | Promise<Receipt[]>;
    findById(receipt_id: string): Receipt | null | Promise<Receipt | null>;
    findByClaim(claim: string): Receipt[] | Promise<Receipt[]>;
    save(receipt: Receipt): void | Promise<void>;
}
export interface DowngradePropagator {
    propagate(downgrade: SourceDowngrade, token: OperatorToken): Promise<PropagationResult>;
}
export declare class LocalDowngradePropagator implements DowngradePropagator {
    private store;
    constructor(store: ReceiptStore);
    propagate(downgrade: SourceDowngrade, token: OperatorToken): Promise<PropagationResult>;
}
