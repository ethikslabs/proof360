/** Evidence candidate returned by a CORPUS provider query */
export interface EvidenceCandidate {
    source_id: string;
    content: string;
    relevance_score: number;
    retrieved_at: string;
}
/** Source quality state as reported by a CORPUS provider */
export interface SourceState {
    source_id: string;
    state: "current" | "downgraded";
    last_checked: string;
}
/** Contract for CORPUS providers — type-only, no implementation */
export interface CorpusProvider {
    retrieveEvidence(query: string): Promise<EvidenceCandidate[]>;
    getSourceState(source_id: string): Promise<SourceState>;
}
