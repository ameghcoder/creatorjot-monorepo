# CreatorJot Backend — Architecture

## System Overview

CreatorJot is a Node.js/TypeScript Express backend that accepts YouTube URLs, fetches video transcripts (from a local cache or an external API), processes them through AI workers, and delivers generated social-media content to users in real time.

The system is split into **three independently deployable processes**:

1. **API Server** (`src/server.ts`) — handles HTTP requests, validates auth, saves payloads, checks the transcript cache, and enqueues background jobs.
2. **TranscriptWorker** (`src/worker/run-transcript-worker.ts`) — picks up transcript jobs, fetches the raw transcript from an external API, stores the file in Supabase Storage, and runs Gemini AI to produce a summary and key points.
3. **GenerationWorker** (`src/worker/run-generation-worker.ts`) — picks up generation jobs, reads the transcript summary, calls Claude AI to produce platform-specific content, saves the result, and notifies the user.

All three processes share the same PostgreSQL database (Supabase). The queue infrastructure is provided by **pg-boss**, which stores job state inside PostgreSQL so no separate message broker is needed.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  API Server (src/server.ts + src/app.ts)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ video.route  │  │ jobs.route   │  │ health.route     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │
│         │                 │                                 │
│  ┌──────▼─────────────────▼──────────────────────────────┐  │
│  │  JobManagementService  ←→  QueueManager (pg-boss)     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │ publishes to PostgreSQL (pg-boss schema)
         ▼
┌─────────────────────────┐   ┌────────────────────────────┐
│  TranscriptWorker       │   │  GenerationWorker          │
│  (run-transcript-worker)│   │  (run-generation-worker)   │
│  - Fetches transcript   │   │  - Reads transcript data   │
│  - Saves to storage     │   │  - Calls Claude API        │
│  - Calls Gemini API     │   │  - Saves generation        │
│  - Updates DB           │   │  - Sends notification      │
└─────────────────────────┘   └────────────────────────────┘
         │                               │
         └──────────────┬────────────────┘
                        ▼
              Supabase (PostgreSQL + Storage)
                        │
                        ▼
              NotificationService
              (WebSocket → SSE → Email)
```

---

## Request Lifecycle — POST /api/v1/yt

This is the main entry point. A client submits a YouTube URL and optionally requests auto-generation of social content.

**Step 1 — Auth validation**
`authMiddleware` validates the JWT via Supabase. Unauthenticated requests are rejected with 401 before the route handler runs.

**Step 2 — Request body validation**
The route handler parses the body with a Zod schema (`PayloadSchema`). Invalid bodies return 400 with structured field-level errors.

**Step 3 — YouTube video ID extraction**
`extractVideoId()` (from `src/services/youtube.service.ts`) parses the URL and returns the 11-character video ID. If extraction fails, the request is rejected with 400.

**Step 4 — YouTube video existence check (OEmbed)**
Before doing any database work, the handler verifies the video actually exists by calling the YouTube OEmbed endpoint:
```
GET https://www.youtube.com/oembed?url=https://youtu.be/{id}
```
A `200 OK` response confirms the video is public and returns metadata (`title`, `author_name`, `author_url`, `type`, `thumbnail_url`, etc.) that can be stored alongside the payload. Any non-200 response (404 for private/deleted videos, 401 for embeds-disabled videos) causes the request to be rejected with 404 and a clear error message. This replaces thumbnail-URL-based existence checks, which are unreliable.

**Step 5 — Session resolution**
The handler looks up the `sessionId` supplied in the request body. If an active session exists for that user, it is reused. If no session is found, a new one is created in the `sessions` table. Inactive sessions are rejected with 403.

**Step 6 — Payload saved to database**
`savePayloads()` inserts a record into the `payloads` table capturing the user ID, session ID, YouTube ID, output language, tone preference, and settings. The returned `payloadId` is included in the response.

**Step 7 — Transcript cache check and fetch**
`transcriptExists()` queries the `transcript` table by `yt_id`. If a cached record exists, it is used directly (cache hit). If not, `fetchTranscriptFromAPI()` fetches the transcript from the external API, saves the raw text to Supabase Storage, and inserts a record into the `transcript` table (cache miss). Either way, the handler now has a `transcript_id`, `url`, `lang`, and `duration`.

**Step 8 — Transcript AI job enqueue (conditional)**
If the cached transcript does not yet have an AI summary (`short_summary` is empty or `key_points` is missing), `jobManagementService.enqueueTranscriptJob()` creates a record in `transcript_queue` and publishes a message to the `transcript-queue` pg-boss queue. The `TranscriptWorker` will pick this up asynchronously.

**Step 9 — Generation jobs enqueue (conditional)**
If `settings.auto_generate === true` and `settings.platforms` is non-empty, the handler iterates over the requested platforms. For each platform it checks the user's quota via `check_user_quota` RPC, then calls `jobManagementService.enqueueGenerationJob()` which inserts a record in `generation_queue` and publishes to the `generation-queue` pg-boss queue.

**Response — 201 Created**
```json
{
  "message": "Video queued for processing",
  "payload_id": "<uuid>",
  "session_id": "<uuid>",
  "transcript": {
    "id": "<uuid>",
    "url": "<storage-url>",
    "lang": "en",
    "duration": 312.5,
    "cached": true,
    "has_ai_summary": false,
    "ai_processing_job_id": "<uuid>"
  },
  "user": { "plan": { "plan_type": "free" } },
  "generation_jobs": [{ "platform": "linkedin", "job_id": "<uuid>" }],
  "queue_info": {
    "transcript_job_queued": true,
    "generation_jobs_queued": 1,
    "total_jobs": 2
  }
}
```

---

## Job Lifecycle State Machine

Both `transcript_queue` and `generation_queue` rows follow the same state machine:

```
pending → processing → completed
                    ↘ failed  (retried if attempts < max_attempts)
                    ↘ cancelled (user-initiated via DELETE /api/v1/jobs/:jobId)
```

| State | Meaning |
|-------|---------|
| `pending` | Job created, waiting for a worker to pick it up |
| `processing` | A worker has claimed the job and is actively running it |
| `completed` | Worker finished successfully |
| `failed` | Worker encountered an error; may be retried |
| `cancelled` | User cancelled the job before or during processing |

**Retry behaviour** is managed by `ErrorHandler` (`src/worker/ErrorHandler.ts`). Transient errors (network timeouts, HTTP 5xx, rate limits) are retried with exponential backoff (1 s → 5 s → 15 s). Permanent errors (HTTP 4xx, `QuotaExceededError`, `TranscriptNotAvailableError`) skip retries and move directly to `failed`.

Every state transition is recorded in the `job_logs` table with an `event_type` (`queued`, `started`, `completed`, `failed`, `retry`, `cancelled`), a message, and optional error details.

---

## Worker Responsibilities

Workers are **standalone Node.js processes** — they are NOT part of the API Server. Each worker connects to the same PostgreSQL database and subscribes to its queue via pg-boss.

### TranscriptWorker (`src/worker/TranscriptWorker.ts`)

Started with: `npm run transcript-worker`

| Step | Action |
|------|--------|
| 1 | Subscribe to `transcript-queue` via `QueueManager.subscribe()` |
| 2 | Check if transcript already exists in DB (idempotency guard) |
| 3 | Fetch raw transcript from external API (`fetchTranscriptFromAPI`) |
| 4 | Save transcript text file to Supabase Storage |
| 5 | Call Gemini AI to generate `short_summary` and `key_points` |
| 6 | Update the `transcript` table with summary and key points |
| 7 | Mark job as `completed` in `transcript_queue` |

Progress is tracked in `transcript_queue.metadata` as a percentage (0–100) with a `currentStep` label so clients can poll for progress.

### GenerationWorker (`src/worker/GenerationWorker.ts`)

Started with: `npm run generation-worker`

| Step | Action |
|------|--------|
| 1 | Subscribe to `generation-queue` via `QueueManager.subscribe()` |
| 2 | Fetch `short_summary` and `key_points` from the `transcript` table |
| 3 | Optionally fetch user tone preferences from `user_tone` table |
| 4 | Call Claude AI to generate platform-specific content |
| 5 | Apply platform character limits (X: 280, LinkedIn: 3000, Blog: 10000, etc.) |
| 6 | Save the generated content to the `generations` table |
| 7 | Update `generation_queue.generation_id` with the new record ID |
| 8 | Send notification via `NotificationService` (WebSocket → SSE → email) |
| 9 | Mark job as `completed` in `generation_queue` |

### Graceful Shutdown

Both workers register `SIGTERM` and `SIGINT` handlers. On signal receipt, the worker stops accepting new jobs, waits up to 30 seconds for the current job to finish, then exits. If the job does not finish within the timeout, its status is reset to `pending` so another worker can pick it up.

---

## Queue Design

### Two-Layer Architecture

The queue system has two distinct layers that serve different purposes:

**Layer 1 — pg-boss (infrastructure)**
pg-boss stores job messages in its own schema (`pgboss` by default) inside PostgreSQL. It handles:
- Durable job storage (survives process restarts)
- Retry scheduling with exponential backoff
- Dead-letter behaviour for permanently failed jobs
- Concurrency control (prevents double-processing)
- Job expiry and retention cleanup

**Layer 2 — Business tables (application)**
The application maintains its own `transcript_queue` and `generation_queue` tables. These track:
- Business-level status (`pending` / `processing` / `completed` / `failed` / `cancelled`)
- Progress percentage and current step (for client polling)
- Attempt count and error messages
- Links to the user, session, transcript, and generation records

The two layers are linked by the job UUID: the same ID is used as the pg-boss job ID and the primary key in the business table.

### Queue Names

| Queue | pg-boss name | Business table |
|-------|-------------|----------------|
| Transcript processing | `transcript-queue` | `transcript_queue` |
| Content generation | `generation-queue` | `generation_queue` |

### Priority Scoring

Jobs are assigned a numeric priority when enqueued. pg-boss processes higher-priority jobs first.

| User tier | Base priority | Age bonus (max) | Max priority |
|-----------|--------------|-----------------|-------------|
| Free | 25 | +25 (after 1 hour) | 50 |
| Paid | 75 | +25 (after 1 hour) | 100 |

The age bonus scales linearly: a job that is 30 minutes old gets +12.5 points; a job that is 60+ minutes old gets the full +25. This prevents free-tier jobs from starving indefinitely.

Priority is calculated by `calculatePriority(userTier, jobAge)` in `src/queue/utils/priority.ts`.

### Duplicate Prevention

`DuplicateChecker` (`src/queue/utils/DuplicateChecker.ts`) prevents the same job from being enqueued twice within a 24-hour window. If a duplicate is detected, the existing job ID is returned instead of creating a new one.

---

## How to Extend

### Adding a New API Route

1. Create a new router file under `src/modules/<domain>/<domain>.route.ts`.
2. Define your Zod schema for request validation in `<domain>.schema.ts`.
3. Import and mount the router in `src/app.ts`:
   ```typescript
   import myRouter from "./modules/my-domain/my-domain.route.js";
   app.use("/api/v1/my-domain", authMiddleware, myRouter);
   ```
4. If the route needs to enqueue jobs, import `jobManagementService` from `src/queue/JobManagementService.ts` as a static top-of-file import (not a dynamic import inside the handler).
5. Use `next(error)` for unexpected errors — do not mix inline `res.status(500)` calls with `next(error)`.

### Adding a New Job Type

1. **Define the job data type** in `src/queue/types.ts` (e.g., `MyNewQueueJob`).
2. **Add a queue name constant** in `src/queue/QueueManager.ts`:
   ```typescript
   export const QUEUE_NAMES = {
     TRANSCRIPT: "transcript-queue",
     GENERATION: "generation-queue",
     MY_NEW: "my-new-queue",   // add this
   } as const;
   ```
3. **Create a database migration** adding a `my_new_queue` table with the standard columns: `id`, `user_id`, `session_id`, `status`, `priority`, `attempts`, `max_attempts`, `metadata`, `error_message`, `created_at`, `updated_at`.
4. **Add an enqueue method** to `JobManagementService` following the pattern of `enqueueTranscriptJob` — insert a DB record, call `logJobEvent`, then `queueManager.publish`.
5. **Create a worker** at `src/worker/MyNewWorker.ts` following the pattern of `TranscriptWorker`:
   - Constructor sets `workerId` and creates an `ErrorHandler`.
   - `start()` calls `queueManager.subscribe(QUEUE_NAMES.MY_NEW, ...)` and `setupShutdownHandlers()`.
   - `processJob()` updates status to `processing`, does the work, updates progress, marks `completed`.
   - `handleJobError()` delegates to `ErrorHandler`.
6. **Create an entry point** at `src/worker/run-my-new-worker.ts` (see `run-transcript-worker.ts` for the pattern).
7. **Add npm scripts** to `package.json`:
   ```json
   "my-new-worker": "tsx src/worker/run-my-new-worker.ts",
   "railway:my-new-worker": "node dist/worker/run-my-new-worker.js"
   ```

### Adding a New Notification Channel

The `NotificationService` (`src/notifications/NotificationService.ts`) orchestrates delivery. The current priority order is: WebSocket → SSE → email.

1. **Create a client class** at `src/notifications/MyChannelClient.ts` with at minimum:
   ```typescript
   async send(userId: string, data: NotificationData): Promise<boolean>
   async shutdown(): Promise<void>
   ```
2. **Add the client to `NotificationService`**:
   - Import and accept it in the constructor.
   - Add an `isUserConnected` check if the channel supports real-time delivery.
   - Insert it into the delivery chain in `sendJobNotification()` at the appropriate priority position.
3. **Update `getStats()`** to include the new channel's statistics.
4. **Update `shutdown()`** to call `myChannelClient.shutdown()`.
5. **Wire it up** in the worker entry point (`run-generation-worker.ts`) where `NotificationService` is instantiated.

No changes to `QueueManager`, `JobManagementService`, or the workers are needed — notification delivery is fully encapsulated inside `NotificationService`.

---

## Key Files Reference

| File | Role |
|------|------|
| `src/server.ts` | Entry point: validates env, initialises QueueManager, starts HTTP server, handles graceful shutdown |
| `src/app.ts` | Express app: registers middleware, mounts routers |
| `src/modules/video/video.route.ts` | POST /api/v1/yt — main video submission endpoint |
| `src/modules/jobs/jobs.route.ts` | Job CRUD: enqueue, status, cancel, metrics, batch |
| `src/queue/QueueManager.ts` | pg-boss wrapper: initialize, publish, subscribe, complete, fail, stop |
| `src/queue/JobManagementService.ts` | Business-level job operations: enqueue with duplicate check, status, cancel, metrics |
| `src/queue/utils/priority.ts` | Priority scoring: free=25, paid=75, age bonus up to +25 |
| `src/queue/utils/DuplicateChecker.ts` | Idempotency: prevents duplicate jobs within 24-hour window |
| `src/worker/TranscriptWorker.ts` | Processes transcript jobs: fetch → store → Gemini summarise → DB update |
| `src/worker/GenerationWorker.ts` | Processes generation jobs: fetch transcript data → Claude generate → format → save → notify |
| `src/worker/ErrorHandler.ts` | Error classification (transient/permanent), retry logic, exponential backoff |
| `src/notifications/NotificationService.ts` | Orchestrates delivery: WebSocket → SSE → email fallback |
| `src/modules/db/db.transcript.ts` | Transcript DB operations: existence check, save, update summary/key points |
| `src/lib/supabase.ts` | Supabase singleton client (service role) |
| `src/utils/env.ts` | Single source of truth for all environment variables |
