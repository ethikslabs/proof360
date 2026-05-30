import { type AttestedResponse } from "../attestation/index.js";
import type { CorpusProvider } from "../corpus/index.js";
import type { ReceiptStore } from "../downgrade/index.js";
import { type Receipt } from "../receipt/index.js";
import type { ProofPath, SourceRef } from "../types.js";
export interface AttestInput<T> {
    claim: string;
    proof_path?: ProofPath | null;
    source_refs?: SourceRef[];
    payload: T;
}
export interface AttestResult<T> {
    response: AttestedResponse<T>;
    receipt: Receipt;
}
export declare class AttestationService {
    private store;
    private corpus?;
    constructor(store: ReceiptStore, corpus?: CorpusProvider | undefined);
    attest<T>(input: AttestInput<T>): Promise<AttestResult<T>>;
}
