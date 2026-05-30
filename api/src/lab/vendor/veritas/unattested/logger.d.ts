export interface AccessLogEntry {
    caller_id: string;
    query_hash: string;
    corpus_refs: string[];
    called_at: string;
    reason?: string;
    request_id?: string;
}
export interface AccessLogger {
    log(entry: AccessLogEntry): Promise<void>;
}
export declare class InMemoryLogger implements AccessLogger {
    entries: AccessLogEntry[];
    log(entry: AccessLogEntry): Promise<void>;
}
