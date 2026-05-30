import type { OperatorToken, RawReadOptions } from "../types.js";
import type { AccessLogger } from "./logger.js";
export interface UnattestedResponse {
    unattested: true;
    data: unknown;
    query_hash: string;
    corpus_refs: string[];
    called_at: string;
}
export declare function corpusRawRead(query: string, caller: OperatorToken, options: RawReadOptions | undefined, logger: AccessLogger): Promise<UnattestedResponse>;
