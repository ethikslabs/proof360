# Architecture Map

This is the orientation map, not a full architecture spec.

## System Shape

```text
Founder
  -> Proof360 frontend
  -> Proof360 API
  -> cold-read session state
  -> founder memory kernel
  -> projections
  -> vendor / investor / posture / program surfaces
```

## Main Components

### Frontend

React application under `frontend/`.

Responsibilities:

- Founder chat and cold-read entry.
- Sidebar and projection surfaces.
- Auth0 login flow for private memory.
- Rendering projection-derived lit tiles.

### API

The API is the server interface the frontend calls. Proof360's API is a Fastify service under `api/`; Fastify is the Node.js web framework used by this service.

Responsibilities:

- Cold-read session lifecycle.
- Signal extraction and analysis.
- Session chat.
- Private founder memory routes.
- Projection computation.

### Session State

Cold-read sessions are still pipeline state. They are not founder truth by default.

Session signals become durable founder memory only through explicit promotion:

```text
POST /api/v1/sessions/:sessionId/profile
```

### Founder Memory Kernel

File-backed V1 store under `MEMORY_STORE_DIR`.

Canonical memory is immutable transaction JSON:

```text
transaction files -> replay -> current claims -> projections
```

Snapshots are rebuildable caches. Transaction files are canonical.

### Projections

Projections are computed on read.

They are not facts. They answer:

```text
Based on what we currently know, where does this company appear to stand?
```

Projection outputs include state, confidence, contributing claims, contributing observations, and missing inputs.

## External Estate Boundaries

- CORPUS: shared evidence layer.
- VERITAS: claim verification and proof.
- FORUM: commercial and supplier route surfacing.
- Ethiks360: external relationship destination after trust is established.

Proof360 should not import those roles into its private memory store. It should reference them by evidence/source when needed.
