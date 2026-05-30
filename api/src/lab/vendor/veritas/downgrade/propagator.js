import { appendEvent } from "../receipt/index.js";
import { validateOperatorToken } from "../operator-auth/index.js";
export class LocalDowngradePropagator {
    store;
    constructor(store) {
        this.store = store;
    }
    async propagate(downgrade, token) {
        const auth = validateOperatorToken(token, "downgrade");
        if (!auth.valid) {
            throw new Error(auth.error);
        }
        const affected = await this.store.findBySource(downgrade.source_id);
        const affectedIds = [];
        const alreadyDowngradedIds = [];
        const appendedEvents = [];
        for (const receipt of affected) {
            const sourceRef = receipt.witnessed_by.find((w) => w.source_id === downgrade.source_id);
            const event = {
                event_type: "source_quality_fell",
                occurred_at: downgrade.timestamp,
                detail: `Source ${downgrade.source_id} downgraded from ${downgrade.previous_state} to ${downgrade.new_state}`,
            };
            const alreadyHasEvent = receipt.events.some((existing) => existing.event_type === event.event_type &&
                existing.occurred_at === event.occurred_at &&
                existing.detail === event.detail);
            if (sourceRef?.source_state === "downgraded" || alreadyHasEvent) {
                alreadyDowngradedIds.push(receipt.receipt_id);
                continue;
            }
            // Update witnessed_by source_state to reflect the downgrade
            const updatedWitnessedBy = receipt.witnessed_by.map((w) => w.source_id === downgrade.source_id
                ? { ...w, source_state: "downgraded" }
                : w);
            const withUpdatedSources = {
                ...receipt,
                witnessed_by: updatedWitnessedBy,
            };
            const updated = appendEvent(withUpdatedSources, event);
            await this.store.save(updated);
            affectedIds.push(receipt.receipt_id);
            appendedEvents.push(updated.events[updated.events.length - 1]);
        }
        return {
            affected_receipt_ids: affectedIds,
            already_downgraded_receipt_ids: alreadyDowngradedIds,
            appended_events: appendedEvents,
        };
    }
}
