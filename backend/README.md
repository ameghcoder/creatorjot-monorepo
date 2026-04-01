# Backend — CreatorJot

Node.js/Express backend that takes a YouTube URL, fetches its transcript, generates an AI summary (Gemini), then produces platform-specific social media content (Claude/Gemini). Jobs are processed asynchronously via pg-boss queues with separate worker processes.

---

## Architecture Overview

```
Client
  │
  ▼
POST /api/v1/yt
  │
  ├─ Validate request (Zod)
  ├─ Extract YouTube video ID
  ├─ Validate session (required — must be active)
  ├─ Save payload record
  ├─ Get or fetch transcript (cache → external API → Supabase Storage + DB)
  ├─ Check duration limit (tier-gated)
  ├─ Enqueue transcript job (if no AI summary yet)
  └─ Enqueue generation jobs (if auto_generate + platforms)

transcript-queue  →  TranscriptWorker  →  transcript.summarizer (Gemini)
generation-queue  →  GenerationWorker  →  AIService / Claude / Gemini
                                        →  NotificationService (WS / SSE / Email)
```

---

## Project Structure

```
backend/
├── src/
│   ├── app.ts                        # Express app — middleware + routes
│   ├── server.ts                     # Entry point — queue init + HTTP server
│   │
│   ├── config/
│   │   ├── index.ts                  # Full typed config (queue, DB, AI, cache)
│   │   ├── cache.ts                  # LRU cache instances
│   │   ├── database.ts               # pg pool config
│   │   ├── limit.ts                  # AI duration limits per tier
│   │   └── validation.ts             # Config validation helpers
│   │
│   ├── lib/
│   │   ├── logger.ts                 # Structured JSON logger
│   │   └── supabase.ts               # Supabase admin client singleton
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT verification, attaches req.user
│   │   ├── correlationId.middleware.ts
│   │   ├── error.middleware.ts       # Central error formatter
│   │   └── rateLimit.middleware.ts   # In-memory sliding window (30 req/min)
│   │
│   ├── modules/
│   │   ├── db/
│   │   │   ├── db.transcript.ts      # Transcript CRUD + getOrFetchTranscript()
│   │   │   └── db.payloads.ts        # Payload insert with Zod validation
│   │   ├── external/
│   │   │   └── api.transcript.ts     # Fetch transcript → storage + DB
│   │   ├── jobs/
│   │   │   ├── jobs.route.ts         # /api/v1/jobs — enqueue, status, cancel, metrics
│   │   │   └── health.route.ts       # /api/v1/health — DB + pg-boss + worker checks
│   │   ├── storage/
│   │   │   └── storage.saveTranscriptFile.ts
│   │   └── video/
│   │       ├── video.route.ts        # POST /api/v1/yt — main submission endpoint
│   │       └── video.schema.ts       # Zod schema (sessionId required)
│   │
│   ├── notifications/
│   │   ├── NotificationService.ts    # Orchestrates WS / SSE / Email routing
│   │   ├── WebSocketServer.ts        # WS server — auth, missed notifications
│   │   ├── SSEServer.ts              # SSE fallback with heartbeat
│   │   ├── EmailClient.ts            # Resend-backed email with 5-min batching
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── queue/
│   │   ├── QueueManager.ts           # pg-boss wrapper
│   │   ├── JobManagementService.ts   # Enqueue, status, cancel, metrics
│   │   ├── types.ts                  # Job types + params
│   │   └── utils/
│   │       ├── DuplicateChecker.ts   # 24-hour idempotency checks
│   │       └── priority.ts           # Priority score by user tier
│   │
│   ├── services/
│   │   ├── youtube.service.ts        # extractVideoId(), thumbnailCheckerById()
│   │   └── ai/
│   │       ├── transcript.summarizer.ts  # Entry point: summarizeTranscript()
│   │       ├── AIService.ts          # Unified AI — model selection + fallback
│   │       ├── ClaudeClient.ts       # Claude API — content generation
│   │       ├── GeminiClient.ts       # Gemini API — summary + key points
│   │       ├── CostTracker.ts        # Token usage + cost tracking (wired)
│   │       └── prompts/
│   │           ├── claude.prompts.ts
│   │           └── gemini.prompts.ts
│   │
│   ├── types/index.ts
│   │
│   ├── utils/
│   │   ├── env.ts                    # Typed env vars + validateEnv()
│   │   ├── user.helpers.ts           # getUserTier(), checkUserQuota()
│   │   ├── api.endpoint.ts
│   │   ├── extractError.ts
│   │   ├── tables.ts
│   │   ├── transcript.cleanup.ts
│   │   └── transcript.sentences.ts   # transcriptToCheckpoints()
│   │
│   ├── worker/
│   │   ├── TranscriptWorker.ts       # Calls transcript.summarizer
│   │   ├── GenerationWorker.ts       # Calls AIService, real userTier
│   │   ├── ErrorHandler.ts           # Error classification + retry/backoff
│   │   ├── workerUtils.ts
│   │   ├── health-server.ts
│   │   ├── run-transcript-worker.ts
│   │   ├── run-generation-worker.ts
│   │   └── run-stuck-detector.ts
│   │
│   └── monitoring/
│       └── run-monitoring.ts         # Metrics HTTP server (port 9090)
│
├── docs/architecture.md
├── package.json
└── .env.local
```

---

## API Endpoints

### POST /api/v1/yt
Submit a YouTube URL for processing. `sessionId` is required — create a session first.

**Request body:**
```json
{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "output_lang": "en",
  "user_tone_id": "uuid-or-null",
  "sessionId": "uuid",
  "settings": {
    "auto_generate": true,
    "platforms": ["x", "linkedin", "blog"]
  }
}
```

**Response 201:**
```json
{
  "payload_id": "uuid",
  "session_id": "uuid",
  "transcript": {
    "id": "uuid",
    "lang": "en",
    "duration": 1234,
    "cached": true,
    "has_ai_summary": false,
    "ai_processing_job_id": "uuid"
  },
  "generation_jobs": [{ "platform": "x", "job_id": "uuid" }],
  "queue_info": {
    "transcript_job_queued": true,
    "generation_jobs_queued": 1,
    "total_jobs": 2
  }
}
```

### GET /api/v1/jobs/:jobId — job status
### DELETE /api/v1/jobs/:jobId — cancel job
### POST /api/v1/jobs/generation — manually enqueue generation
### POST /api/v1/jobs/batch — enqueue up to 10 generation jobs
### GET /api/v1/jobs/metrics — queue depth stats
### GET /api/v1/health — DB + pg-boss + worker health

---

## Environment Variables

```env
# Required
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://...
TRANSCRIPT_COM_API=

# AI (at least one required)
GEMINI_API_KEY=
CLAUDE_API_KEY=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=notifications@creatorjot.com

# Optional — defaults shown
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3001
MONITORING_PORT=9090

PGBOSS_SCHEMA=pgboss
PGBOSS_RETENTION_DAYS=90
PGBOSS_EXPIRE_IN_SECONDS=300

QUEUE_MAX_ATTEMPTS=3
QUEUE_RETRY_DELAYS=1000,5000,15000
QUEUE_PRIORITY_FREE=25
QUEUE_PRIORITY_PAID=75

AI_DEFAULT_MODEL=gemini
GEMINI_MODEL=gemini-2.5-flash
CLAUDE_MODEL=claude-3-5-sonnet-20241022

EMAIL_ENABLED=true
EMAIL_BATCH_WINDOW_MINUTES=5
```

---

## Running Locally

```bash
npm install

# API server
npm run dev

# Workers (separate terminals)
npm run transcript-worker
npm run generation-worker
npm run stuck-detector

# Monitoring server (port 9090)
npm run monitoring
```

---

## Deployment (Railway)

| Service | Command |
|---|---|
| API | `npm run railway:api` |
| Transcript Worker | `npm run railway:transcript-worker` |
| Generation Worker | `npm run railway:generation-worker` |
| Stuck Detector | `npm run railway:stuck-detector` |
| Monitoring | `npm run railway:monitoring` |

---

## Remaining / Pending

### WebSocket integration
`WebSocketServer` is built but not initialized — it needs an `http.Server` instance which isn't available in the worker process. This needs a dedicated discussion about architecture (attach to API server vs. standalone WS process). See the dev notes.

### Database migrations
No migration files in the repo — schema lives only in Supabase. Consider adding Supabase CLI migration files for version control.

### Test coverage
`src/__tests__/` covers AI service and structural tests. Missing:
- Route handler tests
- Worker job processing flows
- Queue integration tests
- Notification routing
