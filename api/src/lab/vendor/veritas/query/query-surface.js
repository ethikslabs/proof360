import { computeEventHash, computeReceiptHash } from "../integrity/index.js";
import { checkForLeaks } from "../leak-gradient/index.js";
/** Retrieves a single receipt with its full event chain. */
export async function getReceipt(receipt_id, store) {
    return store.findById(receipt_id);
}
/** Verifies receipt header integrity and the append-only event chain. */
export async function verifyReceipt(receipt_id, store) {
    const receipt = await store.findById(receipt_id);
    if (receipt === null) {
        return {
            verified: false,
            violations: [
                {
                    type: "missing_receipt",
                    message: `Receipt "${receipt_id}" was not found`,
                },
            ],
        };
    }
    const violations = [];
    const expectedReceiptHash = computeReceiptHash(receipt);
    if (receipt.receipt_hash !== expectedReceiptHash) {
        violations.push({
            type: "receipt_header_hash_mismatch",
            message: "Receipt header hash does not match the stored receipt_hash",
        });
    }
    for (let index = 0; index < receipt.events.length; index++) {
        const event = receipt.events[index];
        const expectedEventHash = computeEventHash(event);
        if (event.event_hash !== expectedEventHash) {
            violations.push({
                type: "event_hash_mismatch",
                message: `Event ${index} hash does not match the stored event_hash`,
                event_index: index,
            });
        }
        const expectedPreviousHash = index === 0 ? null : receipt.events[index - 1].event_hash;
        if (event.previous_event_hash !== expectedPreviousHash) {
            violations.push({
                type: "chain_break",
                message: `Event ${index} previous_event_hash does not match the preceding event hash`,
                event_index: index,
            });
        }
    }
    return violations.length === 0
        ? { verified: true }
        : { verified: false, violations };
}
/** Returns the latest receipt state for a claim. */
export async function claimStatus(claim, store) {
    const receipts = await store.findByClaim(claim);
    if (receipts.length === 0)
        return null;
    const latest = [...receipts].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())[0];
    return { state: latest.state, receipt: latest };
}
/** Lists all receipts referencing the given source_id. */
export async function listReceiptsBySource(source_id, store) {
    return store.findBySource(source_id);
}
/** Lists all downgrade events for receipts referencing the given source_id. */
export async function listDowngrades(source_id, store) {
    const receipts = await store.findBySource(source_id);
    const downgrades = receipts.flatMap((receipt) => receipt.events
        .filter((event) => event.event_type === "source_quality_fell")
        .map((event) => ({
        receipt_id: receipt.receipt_id,
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        detail: event.detail,
    })));
    for (const downgrade of downgrades) {
        if (checkForLeaks(downgrade.detail).length > 0) {
            throw new Error("Leak gradient violation in downgrade event detail");
        }
    }
    return downgrades;
}
