import { v4 as uuidv4 } from 'uuid';

const DASHBOARD_URL = process.env.DASHBOARD_API_URL || 'http://localhost:3001';

export async function emitPulse(pulse) {
  try {
    await fetch(`${DASHBOARD_URL}/pulses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uuidv4(),
        schema_version: '1.0',
        timestamp: new Date().toISOString(),
        source: 'proof360',
        entity_type: 'project',
        entity_id: 'proof360',
        ...pulse,
      }),
    });
  } catch {
    // silent — dashboard being down must never affect Proof360
  }
}
