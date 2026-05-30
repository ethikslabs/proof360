import { validateOperatorToken } from "../operator-auth/index.js";
/**
 * Simple string hash for query fingerprinting.
 * Not cryptographic — scaffold only.
 */
function hashQuery(query) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const ch = query.charCodeAt(i);
        hash = ((hash << 5) - hash + ch) | 0;
    }
    return `qh-${Math.abs(hash).toString(16)}`;
}
export async function corpusRawRead(query, caller, options, logger) {
    const validation = validateOperatorToken(caller, "raw_read");
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    if (!logger) {
        throw new Error("AccessLogger is required: every unattested raw read must be logged before return");
    }
    const calledAt = new Date().toISOString();
    const queryHash = hashQuery(query);
    const corpusRefs = [];
    // Log access BEFORE returning the response — doctrine: HA-2
    await logger.log({
        caller_id: caller.caller_id,
        query_hash: queryHash,
        corpus_refs: corpusRefs,
        called_at: calledAt,
        reason: options?.reason,
        request_id: options?.request_id,
    });
    return {
        unattested: true,
        data: null,
        query_hash: queryHash,
        corpus_refs: corpusRefs,
        called_at: calledAt,
    };
}
