'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function stableStringify(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item) ?? 'null').join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readRecords(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function hashRecord(record) {
  const withoutHash = { ...record };
  delete withoutHash.hash;
  return crypto.createHash('sha256').update(stableStringify(withoutHash)).digest('hex');
}

function createAuditLog(filePath) {
  return {
    append(event) {
      ensureParent(filePath);
      const records = readRecords(filePath);
      const previous = records[records.length - 1];
      const record = {
        schema_version: 'imperium.guard.audit.v1',
        sequence: records.length + 1,
        timestamp: new Date().toISOString(),
        previous_hash: previous ? previous.hash : null,
        event,
      };
      record.hash = hashRecord(record);
      fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`);
      return record;
    },

    read({ limit = 50 } = {}) {
      const records = readRecords(filePath);
      return records.slice(Math.max(0, records.length - limit));
    },

    verifyChain() {
      const records = readRecords(filePath);
      let previousHash = null;
      for (const record of records) {
        if (record.previous_hash !== previousHash) return false;
        if (hashRecord(record) !== record.hash) return false;
        previousHash = record.hash;
      }
      return true;
    },
  };
}

module.exports = {
  createAuditLog,
  hashRecord,
  readRecords,
  stableStringify,
};
