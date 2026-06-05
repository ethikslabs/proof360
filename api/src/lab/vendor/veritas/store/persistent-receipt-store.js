import { computeEventHash, computeReceiptHash } from "../integrity/index.js";
import { VERITAS_HASH_ALGORITHM, VERITAS_RECEIPT_SCHEMA_VERSION, } from "../types.js";
function normalizeDate(value) {
    return value instanceof Date ? value.toISOString() : value;
}
function normalizeJson(value) {
    return typeof value === "string" ? JSON.parse(value) : value;
}
function normalizeNullableJson(value) {
    if (value === null)
        return null;
    return normalizeJson(value);
}
function normalizeOptionalJson(value) {
    if (value === null || value === undefined)
        return undefined;
    return normalizeJson(value);
}
function normalizeOptionalNumber(value) {
    if (value === null || value === undefined)
        return undefined;
    return typeof value === "number" ? value : Number(value);
}
function withCoreReceiptDefaults(receipt) {
    const normalized = {
        ...receipt,
        receipt_schema_version: receipt.receipt_schema_version ?? VERITAS_RECEIPT_SCHEMA_VERSION,
        claim_type: receipt.claim_type ?? "claim.text",
        issuer: receipt.issuer ?? "veritas",
        subject: receipt.subject ?? receipt.claim,
        evidence_refs: receipt.evidence_refs ?? [],
        tenant_id: receipt.tenant_id ?? null,
        hash_algorithm: receipt.hash_algorithm ?? VERITAS_HASH_ALGORITHM,
    };
    if (receipt.confidence !== undefined)
        normalized.confidence = receipt.confidence;
    if (receipt.sensitivity !== undefined)
        normalized.sensitivity = receipt.sensitivity;
    return normalized;
}
function withCoreEventDefaults(receipt, event) {
    return {
        ...event,
        actor_id: event.actor_id ?? receipt.issuer ?? "veritas",
        outcome: event.outcome ?? event.event_type,
    };
}
function buildReceipts(rows) {
    const byId = new Map();
    for (const row of rows) {
        let receipt = byId.get(row.receipt_id);
        if (!receipt) {
            receipt = {
                receipt_id: row.receipt_id,
                receipt_schema_version: row.receipt_schema_version ?? VERITAS_RECEIPT_SCHEMA_VERSION,
                claim: row.claim,
                claim_type: row.claim_type ?? "claim.text",
                state: row.state,
                issuer: row.issuer ?? "veritas",
                subject: row.subject ?? row.claim,
                witnessed_by: normalizeJson(row.witnessed_by),
                evidence_refs: normalizeOptionalJson(row.evidence_refs) ?? [],
                received_at: normalizeDate(row.received_at),
                verifies: normalizeNullableJson(row.verifies),
                tenant_id: row.tenant_id ?? null,
                events: [],
                veritas_version: row.veritas_version,
                hash_algorithm: row.hash_algorithm ?? VERITAS_HASH_ALGORITHM,
            };
            const confidence = normalizeOptionalNumber(row.confidence);
            if (confidence !== undefined) {
                receipt.confidence = confidence;
            }
            if (row.sensitivity !== null && row.sensitivity !== undefined) {
                receipt.sensitivity = row.sensitivity;
            }
            if (row.receipt_hash !== null) {
                receipt.receipt_hash = row.receipt_hash;
            }
            byId.set(row.receipt_id, receipt);
        }
        if (row.event_type && row.occurred_at && row.detail) {
            const event = {
                event_type: row.event_type,
                occurred_at: normalizeDate(row.occurred_at),
                detail: row.detail,
            };
            if (row.actor_id !== null && row.actor_id !== undefined) {
                event.actor_id = row.actor_id;
            }
            if (row.outcome !== null && row.outcome !== undefined) {
                event.outcome = row.outcome;
            }
            if (row.source !== null && row.source !== undefined) {
                event.source = row.source;
            }
            if (row.event_hash !== null) {
                event.event_hash = row.event_hash;
                event.previous_event_hash = row.previous_event_hash;
            }
            receipt.events.push(event);
        }
    }
    return [...byId.values()];
}
function eventHash(event) {
    return event.event_hash ?? computeEventHash(event);
}
export class PersistentReceiptStore {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async save(receipt) {
        const normalizedReceipt = withCoreReceiptDefaults(receipt);
        const receiptHash = normalizedReceipt.receipt_hash ?? computeReceiptHash(normalizedReceipt);
        const events = [];
        for (const rawEvent of normalizedReceipt.events) {
            const event = withCoreEventDefaults(normalizedReceipt, rawEvent);
            const previous = events.length === 0 ? null : eventHash(events[events.length - 1]);
            events.push({
                ...event,
                event_hash: event.event_hash ?? computeEventHash(event),
                previous_event_hash: event.previous_event_hash ?? previous,
            });
        }
        await this.connection.query("BEGIN");
        try {
            await this.connection.query(`INSERT INTO receipts
          (receipt_id, receipt_schema_version, claim, claim_type, state, issuer, subject, witnessed_by, evidence_refs, received_at, verifies, confidence, tenant_id, sensitivity, veritas_version, hash_algorithm, receipt_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (receipt_id) DO NOTHING`, [
                normalizedReceipt.receipt_id,
                normalizedReceipt.receipt_schema_version,
                normalizedReceipt.claim,
                normalizedReceipt.claim_type,
                normalizedReceipt.state,
                normalizedReceipt.issuer,
                normalizedReceipt.subject,
                JSON.stringify(normalizedReceipt.witnessed_by),
                JSON.stringify(normalizedReceipt.evidence_refs ?? []),
                normalizedReceipt.received_at,
                normalizedReceipt.verifies === null ? null : JSON.stringify(normalizedReceipt.verifies),
                normalizedReceipt.confidence ?? null,
                normalizedReceipt.tenant_id,
                normalizedReceipt.sensitivity ?? null,
                normalizedReceipt.veritas_version,
                normalizedReceipt.hash_algorithm,
                receiptHash,
            ]);
            for (const event of events) {
                const existing = await this.connection.query(`SELECT id FROM receipt_events
           WHERE receipt_id = $1
             AND event_type = $2
             AND occurred_at = $3
             AND detail = $4
           LIMIT 1`, [
                    normalizedReceipt.receipt_id,
                    event.event_type,
                    event.occurred_at,
                    event.detail,
                ]);
                if (existing.rows.length > 0)
                    continue;
                await this.connection.query(`INSERT INTO receipt_events
            (receipt_id, event_type, occurred_at, detail, actor_id, outcome, source, event_hash, previous_event_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                    normalizedReceipt.receipt_id,
                    event.event_type,
                    event.occurred_at,
                    event.detail,
                    event.actor_id,
                    event.outcome,
                    event.source ?? null,
                    event.event_hash,
                    event.previous_event_hash,
                ]);
            }
            await this.connection.query("COMMIT");
        }
        catch (error) {
            await this.connection.query("ROLLBACK");
            throw error;
        }
    }
    async findBySource(source_id) {
        const result = await this.connection.query(`SELECT
          r.receipt_id,
          r.receipt_schema_version,
          r.claim,
          r.claim_type,
          r.state,
          r.issuer,
          r.subject,
          r.witnessed_by,
          r.evidence_refs,
          r.received_at,
          r.verifies,
          r.confidence,
          r.tenant_id,
          r.sensitivity,
          r.veritas_version,
          r.hash_algorithm,
          r.receipt_hash,
          e.event_type,
          e.occurred_at,
          e.detail,
          e.actor_id,
          e.outcome,
          e.source,
          e.event_hash,
          e.previous_event_hash
       FROM receipts r
       LEFT JOIN receipt_events e ON e.receipt_id = r.receipt_id
       WHERE r.witnessed_by @> $1::jsonb
       ORDER BY r.receipt_id, e.created_at`, [JSON.stringify([{ source_id }])]);
        return buildReceipts(result.rows);
    }
    async findById(receipt_id) {
        const result = await this.connection.query(`SELECT
          r.receipt_id,
          r.receipt_schema_version,
          r.claim,
          r.claim_type,
          r.state,
          r.issuer,
          r.subject,
          r.witnessed_by,
          r.evidence_refs,
          r.received_at,
          r.verifies,
          r.confidence,
          r.tenant_id,
          r.sensitivity,
          r.veritas_version,
          r.hash_algorithm,
          r.receipt_hash,
          e.event_type,
          e.occurred_at,
          e.detail,
          e.actor_id,
          e.outcome,
          e.source,
          e.event_hash,
          e.previous_event_hash
       FROM receipts r
       LEFT JOIN receipt_events e ON e.receipt_id = r.receipt_id
       WHERE r.receipt_id = $1
       ORDER BY e.created_at`, [receipt_id]);
        return buildReceipts(result.rows)[0] ?? null;
    }
    async findByClaim(claim) {
        const result = await this.connection.query(`SELECT
          r.receipt_id,
          r.receipt_schema_version,
          r.claim,
          r.claim_type,
          r.state,
          r.issuer,
          r.subject,
          r.witnessed_by,
          r.evidence_refs,
          r.received_at,
          r.verifies,
          r.confidence,
          r.tenant_id,
          r.sensitivity,
          r.veritas_version,
          r.hash_algorithm,
          r.receipt_hash,
          e.event_type,
          e.occurred_at,
          e.detail,
          e.actor_id,
          e.outcome,
          e.source,
          e.event_hash,
          e.previous_event_hash
       FROM receipts r
       LEFT JOIN receipt_events e ON e.receipt_id = r.receipt_id
       WHERE r.claim = $1
       ORDER BY r.receipt_id, e.created_at`, [claim]);
        return buildReceipts(result.rows);
    }
}
