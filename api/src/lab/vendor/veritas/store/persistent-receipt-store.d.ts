import type { ReceiptStore } from "../downgrade/index.js";
import type { Receipt } from "../receipt/index.js";
export interface PgConnection {
    /** Checked-out PostgreSQL connection. Callers own release(); do not pass a Pool. */
    query<T = unknown>(text: string, values?: unknown[]): Promise<{
        rows: T[];
    }>;
    release(): void;
}
export declare class PersistentReceiptStore implements ReceiptStore {
    private connection;
    constructor(connection: PgConnection);
    save(receipt: Receipt): Promise<void>;
    findBySource(source_id: string): Promise<Receipt[]>;
    findById(receipt_id: string): Promise<Receipt | null>;
    findByClaim(claim: string): Promise<Receipt[]>;
}
