# src/queue/

Handles all job queue operations. The queue system uses a two-layer design: **pg-boss** for infrastructure-level durability and retry scheduling, and **application tables** (`transcript_queue`, `generation_queue`) for business-level status tracking.

## Two-Layer Queue Design

```
API Server / Worker
       │
       ▼
┌─────────────────────────────────────────────┐
│  Application Layer (Supabase tables)         │
│  transcript_queue / generation_queue         │
│  Tracks: status, progress, attempts, errors  │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Infrastructure Layer (pg-boss / pgboss      │
│  schema in PostgreSQL)                       │
│  Handles: durability, retry scheduling,      │
│  dead-letter, expiry, maintenance            │
└─────────────────────────────────────────────┘
```

**Why two layers?** pg-boss owns the job lifecycle at the infrastructure level (it retries, expires, and cleans up jobs automatically). The application tables give us business-level visibility — progress percentages, human-readable status, per-user job history — without coupling that logic to pg-boss internals.

## Files

### `QueueManager.ts`
Thin wrapper around pg-boss. Exposes `initialize`, `publish`, `subscribe`, `complete`, `fail`, `getQueueSize`, and `stop`.

- **Modify when**: you need to change pg-boss configuration (schema, retention, expiry) or add a new low-level queue operation.
- **Do not modify** to add business logic — that belongs in `JobManagementService`.

Queue names are defined here as constants:
```ts
QUEUE_NAMES.TRANSCRIPT  // "transcript-queue"
QUEUE_NAMES.GENERATION  // "generation-queue"
```

`ensureInitialized()` throws rather than auto-initializing — this is intentional. The server entry point (`src/server.ts`) must call `queueManager.initialize()` before any routes are registered. Silent auto-init would hide startup ordering bugs.

### `JobManagementService.ts`
Business-level job operations. This is the primary interface for the rest of the application.

Responsibilities:
- Enqueue transcript and generation jobs (with duplicate checking)
- Create the corresponding row in `transcript_queue` / `generation_queue`
- Publish the job to pg-boss
- Query job status (checks both queues)
- Cancel jobs (sets status to `cancelled`)
- Return queue metrics

- **Modify when**: you need to add a new job type, change enqueue logic, or add new job management operations.
- **Do not modify** `QueueManager` directly from routes — always go through `JobManagementService`.

### `utils/DuplicateChecker.ts`
Prevents duplicate job submissions within a 24-hour window.

Idempotency keys:
- Transcript jobs: `user_id + yt_id + session_id`
- Generation jobs: `user_id + transcript_id + platform + output_lang`

Returns the existing job ID if a duplicate is found, so the caller can return it to the client without creating a new job.

- **Modify when**: you need to change the deduplication window or idempotency key composition.

### `utils/priority.ts`
Calculates job priority scores.

| User tier | Base priority | Max priority (with age factor) |
|-----------|--------------|-------------------------------|
| free      | 25           | 50                            |
| paid      | 75           | 100                           |

Age factor: jobs older than 1 hour gain up to 25 additional priority points (linear scaling). This prevents free-tier jobs from starving indefinitely.

- **Modify when**: you need to change priority scoring rules or add new tiers.

### `types.ts`
All TypeScript types for the queue system. No logic — just type definitions.

### `index.ts`
Re-exports for convenience.

## Job Status Flow

```
pending → processing → completed
                    ↘ failed (retried if attempts < max_attempts)
                    ↘ cancelled (user-initiated)
```

Both application tables track this status. pg-boss tracks its own internal state independently.

## Adding a New Job Type

1. Add a new queue name constant to `QueueManager.ts`
2. Add the job params interface to `types.ts`
3. Add an `enqueue*` method to `JobManagementService.ts`
4. Add duplicate checking logic to `DuplicateChecker.ts` if needed
5. Create a new worker in `src/worker/` that subscribes to the new queue
