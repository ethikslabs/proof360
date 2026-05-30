import { checkForLeaks } from "../leak-gradient/index.js";
function assertNoLeaks(output) {
    const strings = [
        output.receipt_id,
        output.receipt_schema_version,
        output.claim,
        output.claim_type,
        output.issuer,
        output.subject,
        output.state,
        output.received_at,
        output.attested_at,
        output.sensitivity,
        output.hash_algorithm,
        ...(output.witnessed_by ?? []).flatMap((source) => [
            source.display_label,
            source.source_state,
        ]),
    ].filter((value) => typeof value === "string");
    for (const value of strings) {
        const leaks = checkForLeaks(value);
        if (leaks.length === 0)
            continue;
        const details = leaks
            .map((leak) => `"${leak.term}" at position ${leak.position}`)
            .join(", ");
        throw new Error(`Leak gradient violation in customer-facing verification: ${details}`);
    }
}
/**
 * Renders a verification result safe for customer surfaces.
 * Raw hashes, source ids, event details, and violation internals are stripped.
 */
export function toCustomerFacingVerification(result, receipt) {
    const output = {
        receipt_id: receipt.receipt_id,
        receipt_schema_version: receipt.receipt_schema_version,
        claim: receipt.claim,
        claim_type: receipt.claim_type,
        issuer: receipt.issuer,
        subject: receipt.subject,
        verified: result.verified,
        state: receipt.state,
        received_at: receipt.received_at,
        attested_at: receipt.verifies?.attested_at ?? null,
        witnessed_by: receipt.witnessed_by.map((source) => ({
            display_label: source.display_label,
            source_state: source.source_state,
        })),
        hash_algorithm: receipt.hash_algorithm,
    };
    if (receipt.confidence !== undefined) {
        output.confidence = receipt.confidence;
    }
    if (receipt.sensitivity !== undefined) {
        output.sensitivity = receipt.sensitivity;
    }
    assertNoLeaks(output);
    return output;
}
