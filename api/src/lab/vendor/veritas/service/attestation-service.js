import { randomUUID } from "node:crypto";
import { validate, } from "../attestation/index.js";
import { createReceipt } from "../receipt/index.js";
const VERITAS_VERSION = "0.1.0";
function determineState(proofPath, sourceRefs) {
    if (proofPath && sourceRefs.length > 0)
        return "Attested";
    if (proofPath)
        return "Inferred";
    return "Unknown";
}
export class AttestationService {
    store;
    corpus;
    constructor(store, corpus) {
        this.store = store;
        this.corpus = corpus;
    }
    async attest(input) {
        if (this.corpus) {
            await this.corpus.retrieveEvidence(input.claim);
        }
        const proofPath = input.proof_path ?? null;
        const sourceRefs = input.source_refs ?? [];
        const state = determineState(proofPath, sourceRefs);
        const now = new Date().toISOString();
        const receiptId = randomUUID();
        const response = {
            payload: input.payload,
            attestation: {
                state,
                proof_path_id: proofPath?.proof_path_id ?? null,
                corpus_refs: sourceRefs.map((source) => source.source_id),
                attested_at: now,
                veritas_version: VERITAS_VERSION,
            },
            receipt_id: receiptId,
        };
        const validation = validate(response);
        if (!validation.valid) {
            throw new Error(`Invalid attestation response: ${validation.error}`);
        }
        const receipt = createReceipt({
            response,
            claim: input.claim,
            witnessed_by: sourceRefs,
            verifies: proofPath,
            received_at: now,
        });
        await this.store.save(receipt);
        return { response, receipt };
    }
}
