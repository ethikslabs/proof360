// Compliance_Debt: This scaffold performs expiry and scope checks only.
// Real cryptographic verification and external auth provider integration are deferred.
export function validateOperatorToken(token, requiredScope) {
    const expiresAt = Date.parse(token.expires_at);
    if (!Number.isFinite(expiresAt)) {
        return { valid: false, error: "Token expires_at is invalid" };
    }
    if (Date.now() > expiresAt) {
        return { valid: false, error: "Token expired" };
    }
    if (!Array.isArray(token.scope) || !token.scope.includes(requiredScope)) {
        return {
            valid: false,
            error: `Missing required scope: ${requiredScope}`,
        };
    }
    return { valid: true, caller_id: token.caller_id };
}
export function createOperatorToken(caller_id, scope, durationMs = 60 * 60 * 1000) {
    const issuedAt = new Date();
    return {
        caller_id,
        issued_at: issuedAt.toISOString(),
        expires_at: new Date(issuedAt.getTime() + durationMs).toISOString(),
        scope: [...scope],
    };
}
