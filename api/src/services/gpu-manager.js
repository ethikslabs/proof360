// GPU lifecycle manager — NVIDIA NIM on EC2 on-demand
// Starts the GPU instance when an assessment begins, stops it after idle timeout.
// All config via env vars — see docs/nim-gpu-inference.md for setup.

import { EC2Client, StartInstancesCommand, DescribeInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';

const ec2 = new EC2Client({ region: process.env.GPU_REGION || 'ap-southeast-2' });

const INSTANCE_ID   = process.env.GPU_INSTANCE_ID;   // e.g. i-xxxxxxxxxxxxxxxxx
const NIM_HOST      = process.env.NIM_HOST;           // e.g. http://10.x.x.x:8000
const POLL_MS       = 5_000;
const WARM_TIMEOUT  = 180_000; // 3 min
const IDLE_TIMEOUT  = 10 * 60 * 1000; // 10 min

// Singleton warm-up promise — prevents concurrent start races
let warmUpPromise = null;
let idleTimer = null;

// Call at session start. Non-blocking — caller should not await.
// Resolves true when NIM is healthy, false on timeout or misconfiguration.
export async function ensureGPUReady() {
  if (!INSTANCE_ID || !NIM_HOST) {
    console.warn('[gpu] GPU_INSTANCE_ID or NIM_HOST not set — skipping GPU warm-up');
    return false;
  }

  // If already warming up, share the same promise
  if (warmUpPromise) return warmUpPromise;

  warmUpPromise = _warmUp().finally(() => {
    warmUpPromise = null;
  });

  return warmUpPromise;
}

// Check NIM health — fast, used before each inference call
export async function isNIMHealthy() {
  if (!NIM_HOST) return false;
  try {
    const res = await fetch(`${NIM_HOST}/v1/models`, { signal: AbortSignal.timeout(3_000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Reset idle shutdown timer — call on session start and after each NIM call
export function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log('[gpu] Idle timeout reached — stopping GPU instance');
    stopGPU().catch(err => console.error('[gpu] Auto-stop failed:', err.message));
  }, IDLE_TIMEOUT);
}

export async function stopGPU() {
  if (!INSTANCE_ID) return;
  try {
    await ec2.send(new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    console.log('[gpu] Instance stop requested:', INSTANCE_ID);
  } catch (err) {
    console.error('[gpu] Stop failed:', err.message);
  }
}

// --- internals ---

async function _warmUp() {
  console.log('[gpu] Starting warm-up for instance:', INSTANCE_ID);
  resetIdleTimer();

  try {
    // Check current state first — may already be running
    const state = await _getInstanceState();
    console.log('[gpu] Instance state:', state);

    if (state === 'running') {
      return await _waitForNIMHealth();
    }

    if (state === 'stopping') {
      // Wait for it to fully stop before starting
      await _waitForState('stopped', WARM_TIMEOUT);
    }

    if (state === 'stopped' || state === 'stopping') {
      await ec2.send(new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
      console.log('[gpu] Start command sent');
    }

    // Wait for EC2 running
    const running = await _waitForState('running', WARM_TIMEOUT);
    if (!running) {
      console.error('[gpu] Instance did not reach running state in time');
      return false;
    }

    // Wait for NIM health
    return await _waitForNIMHealth();

  } catch (err) {
    console.error('[gpu] Warm-up error:', err.message);
    return false;
  }
}

async function _getInstanceState() {
  const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  return res.Reservations?.[0]?.Instances?.[0]?.State?.Name ?? 'unknown';
}

async function _waitForState(targetState, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await _getInstanceState();
    if (state === targetState) return true;
    await _sleep(POLL_MS);
  }
  return false;
}

async function _waitForNIMHealth() {
  const deadline = Date.now() + WARM_TIMEOUT;
  console.log('[gpu] Waiting for NIM health...');
  while (Date.now() < deadline) {
    if (await isNIMHealthy()) {
      console.log('[gpu] NIM healthy — ready for inference');
      return true;
    }
    await _sleep(POLL_MS);
  }
  console.error('[gpu] NIM did not become healthy in time');
  return false;
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
