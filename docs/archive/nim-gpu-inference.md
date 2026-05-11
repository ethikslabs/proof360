# NIM GPU Inference — Implementation Spec

**Status:** Specced — not yet built
**Author:** John Coates
**Date:** 2026-04-22

---

## Overview

Self-hosted NVIDIA NIM inference on EC2 GPU, spun up on-demand per assessment session.
Replaces OpenAI calls in the trust360 evaluation path.
Data never leaves the stack. GPU cost covered by AWS credits.

**Positioning:** "AI inference runs on NVIDIA-certified GPU infrastructure. Your data is processed on private compute."

---

## Architecture

```
POST /api/session/start
  ├─→ GPU spin-up (background, non-blocking)        ← NEW
  └─→ extractAndInfer() pipeline (existing)
        │
        ├─ Firecrawl scrape       (~30–60s, buys GPU warm time)
        ├─ Claude Haiku extraction (existing, unchanged)
        │
        POST /api/session/submit
          └─→ gap-mapper.js
                └─→ trust-client.js
                      ├─ NIM healthy? → NIM endpoint  ← NEW
                      └─ fallback → Trust360 / OpenAI  (existing)
```

---

## GPU Instance

| Setting | Value |
|---------|-------|
| Instance type | `g4dn.xlarge` (T4, 16GB VRAM) — upgrade to `g5.xlarge` if needed |
| Region | `ap-southeast-2` (same as EC2 production) |
| Cost | ~$0.53/hr — burns AWS credits, not cash |
| Runtime | NIM container via Docker + NVIDIA Container Toolkit |
| Model | `meta/llama-3.1-8b-instruct` (fits T4, fast, capable) |
| API | OpenAI-compatible — `POST /v1/chat/completions` |
| Port | `8000` (NIM default) |

**Billing discipline:** Instance stopped when not serving assessments (auto-stop after idle timeout).

---

## New Files

### `api/src/services/gpu-manager.js`

Manages EC2 GPU instance lifecycle.

```js
import { EC2Client, StartInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';

const ec2 = new EC2Client({ region: 'ap-southeast-2' });
const INSTANCE_ID = process.env.GPU_INSTANCE_ID;
const NIM_HOST = process.env.NIM_HOST; // e.g. http://10.x.x.x:8000
const POLL_INTERVAL_MS = 5_000;
const WARM_TIMEOUT_MS = 180_000; // 3 minutes max wait

// Start instance, wait until NIM is healthy
// Returns true if ready, false if timed out
export async function ensureGPUReady() { ... }

// Check NIM health endpoint
export async function isNIMHealthy() { ... }

// Stop instance (called after idle timeout)
export async function stopGPU() { ... }

// Internal: poll EC2 state until 'running'
async function waitForInstanceRunning(timeoutMs) { ... }

// Internal: poll NIM health until 200
async function waitForNIMHealth(timeoutMs) { ... }
```

**State stored in module-level Map** — one warm-up promise per instance, prevents concurrent start calls racing.

---

### `api/src/services/nim-client.js`

OpenAI-compatible client pointed at NIM endpoint.

```js
const NIM_HOST = process.env.NIM_HOST;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct';
const TIMEOUT_MS = 30_000;

// Drop-in replacement for OpenAI chat completions
export async function nimComplete({ messages, temperature = 0.2 }) { ... }
```

NIM exposes `POST /v1/chat/completions` — identical shape to OpenAI. No SDK needed. Raw fetch.

---

## Modified Files

### `api/src/handlers/session-start.js`

Add GPU warm-up at the top of `extractAndInfer()`. Non-blocking — doesn't hold up the session start response.

```js
import { ensureGPUReady } from '../services/gpu-manager.js';

async function extractAndInfer(sessionId, { website_url, deck_file }, log) {
  // Kick GPU warm-up in background — don't await here
  // By the time gap-mapper runs (~60–90s later), GPU will be ready
  ensureGPUReady().catch(() => {
    // Failure is silent — trust-client.js will fall back to OpenAI
    console.warn('GPU warm-up failed — will use fallback inference');
  });

  // Existing pipeline unchanged
  try {
    const { signals, ... } = await extractSignals(...);
    ...
  }
}
```

---

### `api/src/services/trust-client.js`

Route to NIM if healthy, fall back to Trust360/OpenAI silently.

```js
import { isNIMHealthy } from './gpu-manager.js';
import { nimComplete } from './nim-client.js';

export async function evaluateClaim({ question, evidence, metadata }) {
  // Check NIM first
  if (await isNIMHealthy()) {
    try {
      return await evaluateWithNIM({ question, evidence, metadata });
    } catch (err) {
      console.warn('NIM inference failed, falling back:', err.message);
      // Fall through to Trust360
    }
  }

  // Existing Trust360 path (unchanged)
  return await evaluateWithTrust360({ question, evidence, metadata });
}

async function evaluateWithNIM({ question, evidence, metadata }) {
  const result = await nimComplete({
    messages: [
      { role: 'system', content: NIM_SYSTEM_PROMPT },
      { role: 'user', content: buildClaimPrompt(question, evidence) },
    ],
  });

  // Parse into same shape as Trust360 response
  // { consensus: { mos, variance, agreement }, traceId }
  return parseNIMResponse(result, metadata);
}
```

**Fallback chain:**
1. NIM (GPU, private, fast)
2. Trust360 → OpenAI (existing, unchanged)
3. Confirmed=true fallback (existing, if Trust360 unreachable)

---

## Environment Variables

Add to `api/.env` and AWS SSM under `/proof360/`:

```
GPU_INSTANCE_ID=i-xxxxxxxxxxxxxxxxx   # EC2 GPU instance ID
NIM_HOST=http://10.x.x.x:8000        # Private IP of GPU instance
NIM_MODEL=meta/llama-3.1-8b-instruct # NIM model name
```

AWS credentials already in place (SDK credential chain). No new keys needed.

---

## GPU Instance Setup (one-time)

```bash
# On the GPU instance via SSM
# 1. Install NVIDIA drivers + Docker + NVIDIA Container Toolkit
# 2. Log in to NGC (NVIDIA GPU Cloud)
docker login nvcr.io --username '$oauthtoken' --password <NGC_API_KEY>

# 3. Pull and run NIM
docker run -d \
  --gpus all \
  --name nim-llama \
  -p 8000:8000 \
  -e NGC_API_KEY=<key> \
  nvcr.io/nim/meta/llama-3.1-8b-instruct:latest

# 4. Test
curl http://localhost:8000/v1/models
```

NGC API key comes from NVIDIA dev program portal. Store in SSM at `/nim/ngc-api-key`.

---

## UX — Frontend Status Messages

The existing `infer-status` polling pattern surfaces GPU state through log lines.
Add GPU status messages to the `extractAndInfer` log stream:

```js
log({ text: '  🔒  Initialising secure GPU environment...', type: 'info' });
log({ text: '  ⚡  NVIDIA inference ready — your data stays on private compute', type: 'info' });
```

These appear in the existing activity feed on the frontend — no frontend changes needed for v1.

---

## Auto-Stop (idle timeout)

After assessment completion, start a 10-minute idle timer. If no new assessment starts, stop the instance.

```js
// In gpu-manager.js
let idleTimer = null;

export function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => stopGPU(), 10 * 60 * 1000);
}
```

Call `resetIdleTimer()` at session start and on each NIM call.

---

## Cost Model

| Scenario | Cost |
|----------|------|
| 1 assessment/day | ~$0.02 (3 min GPU time) |
| 10 assessments/day spread across hours | ~$0.20 |
| Left running 24/7 (mistake) | ~$380/month |

**Billing guard:** CloudWatch alarm → SNS → auto-stop if instance runs >4 hours continuous.

---

## Rollout Order

1. **Provision** — launch GPU instance, install NIM, confirm health endpoint
2. **`gpu-manager.js`** — EC2 start/stop/poll/health
3. **`nim-client.js`** — NIM chat completions wrapper
4. **`session-start.js`** — background warm-up trigger
5. **`trust-client.js`** — NIM routing + fallback
6. **SSM** — add GPU vars, deploy
7. **Smoke test** — run one assessment, confirm NIM path, check logs
8. **CloudWatch guard** — idle alarm

---

## What This Enables

- **Data sovereignty** — zero tokens leave the stack during gap evaluation
- **NVIDIA partner positioning** — "NVIDIA NIM on dedicated GPU infrastructure"
- **Enterprise procurement unlock** — passes legal/InfoSec reviews that OpenAI-hosted products fail
- **Cost floor** — AWS credits absorb GPU cost; OpenAI spend drops to Claude-only (extraction + layout)
- **Scalability path** — add more NIM instances, load balance, graduate to always-on when volume justifies it

---

*This spec is implementation-ready. Hand to Kiro to build.*
