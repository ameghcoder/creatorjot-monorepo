# src/worker/

Contains the two background worker processes. **Workers are NOT part of the API Server.** They run as separate Node.js processes and communicate with the API Server only through the shared database (Supabase) and the pg-boss job queue.

## Starting Workers

```bash
npm run transcript-worker   # starts TranscriptWorker
npm run generation-worker   # starts GenerationWorker
```

Each command runs the corresponding entry point script, which initializes the queue manager and starts the worker. Workers are designed to run continuously and process jobs as they arrive.

## Files

### `TranscriptWorker.ts`
Processes jobs from `transcript-queue`.

Job flow:
1. Check if transcript already exists in DB — if yes, mark complete and skip
2. Fetch transcript from external API (`fetchTranscriptFromAPI`)
3. Save transcript file to Supabase Storage
4. Run Gemini summarization (`transcriptSummarizer`)
5. Update `transcript_queue` status to `completed`

Updates progress in `transcript_queue.metadata` at each step (0% → 20% → 100%).

- **Modify when**: the transcript processing pipeline changes (new API, new storage format, new AI step).
- **Do not modify** error handling logic here — that belongs in `ErrorHandler`.

### `GenerationWorker.ts`
Processes jobs from `generation-queue`.

Job flow:
1. Fetch transcript summary and key points from DB
2. Fetch user tone preferences (if `userToneId` is set)
3. Generate platform-specific content via Claude (`ClaudeClient`)
4. Apply platform formatting rules (character limits, etc.)
5. Save generated content to `generations` table
6. Send notification via `NotificationService`
7. Update `generation_queue` status to `completed`

Receives a `NotificationService` instance at construction time (injected by `run-generation-worker.ts`).

- **Modify when**: the generation pipeline changes (new AI model, new platforms, new formatting rules).

### `ErrorHandler.ts`
Classifies errors and implements retry logic with exponential backoff.

Error types:
- **Transient** (retried): network errors (`ETIMEDOUT`, `ECONNREFUSED`), HTTP 429, HTTP 5xx, DB connection errors (`57P03`, `08006`)
- **Permanent** (no retry): HTTP 4xx, `QuotaExceededError`, `TranscriptNotAvailableError`

Retry delays: 1s → 5s → 15s (max 3 attempts).

On permanent failure, `ErrorHandler` updates the job status to `failed`, logs the event to `job_logs`, and sends a failure notification for generation jobs.

- **Modify when**: you need to add new error types, change retry delays, or change the max attempts.
- **Do not modify** to add job-specific logic — keep it generic.

### `run-transcript-worker.ts`
Entry point for the transcript worker process. Initializes `QueueManager` with the pg-boss config, creates a `TranscriptWorker`, and calls `worker.start()`. Also starts a health check HTTP server on port 3002 for Railway health checks.

### `run-generation-worker.ts`
Entry point for the generation worker process. Same as above, but also initializes `WebSocketServer`, `SSEServer`, `EmailClient`, and `NotificationService` before creating the `GenerationWorker`.

### `health-server.ts`
Minimal HTTP server that exposes a `/health` endpoint. Used by Railway (and other deployment platforms) to verify the worker process is alive.

## Graceful Shutdown

Both workers register `SIGTERM` and `SIGINT` handlers via `setupShutdownHandlers()`. On signal:

1. Set `isRunning = false` to stop accepting new jobs
2. Wait up to 30 seconds for the current job to finish (`waitForJobCompletion`)
3. If the job doesn't finish in time, reset its status to `pending` so another worker can pick it up
4. Call `worker.stop()` and `process.exit(0)`

**Do not remove or bypass the shutdown handlers.** They prevent jobs from being abandoned mid-processing when a deployment rolls over.

## Adding a New Worker

1. Create `src/worker/MyWorker.ts` — implement `start()`, `stop()`, `processJob()`, `setupShutdownHandlers()`, and `waitForJobCompletion()`
2. Create `src/worker/run-my-worker.ts` — entry point that initializes the queue and starts the worker
3. Add a new queue name to `src/queue/QueueManager.ts`
4. Add an npm script to `package.json`

Consider extracting `setupShutdownHandlers` and `waitForJobCompletion` into a shared `workerUtils.ts` (tracked in task 10) to avoid copying the pattern.
