import type { OperatorToken } from "../types.js";
export interface MigrationPgConnection {
    /** Checked-out PostgreSQL connection. Callers own release(); do not pass a Pool. */
    query<T = unknown>(text: string, values?: unknown[]): Promise<{
        rows: T[];
    }>;
    release(): void;
}
export interface MigrationResult {
    applied: string[];
    pending: string[];
    sql_preview?: string[];
}
export declare class MigrationRunner {
    private connection;
    private migrationsDir;
    constructor(connection: MigrationPgConnection, migrationsDir: string);
    ensureMigrationsTable(): Promise<void>;
    listPending(): Promise<string[]>;
    execute(token: OperatorToken): Promise<MigrationResult>;
    dryRun(token: OperatorToken): Promise<MigrationResult>;
    private assertMigrateToken;
}
