# CreatorJot

Turn 1 YouTube video into 10+ social media posts. Paste a link, pick your platforms, and get ready-to-post content for X, LinkedIn, blog, email, and more — in seconds.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deploying to Railway](#deploying-to-railway)
- [API Routes](#api-routes)
- [Queue System](#queue-system)

---

## Architecture

CreatorJot is a **pnpm monorepo** with three packages:

```
creatorjot/
├── frontend/        # Next.js 16 app (public site + dashboard)
├── backend/         # Express API + pg-boss workers
└── packages/
    └── shared/      # Shared TypeScript types and constants
```

The backend runs as **5 separate Railway services** from the same codebase:

| Service | Role | Public |
|---|---|---|
| `frontend` | Next.js app | Yes |
| `api` | Express HTTP server | Yes |
| `transcript-worker` | Fetches + processes YouTube transcripts via AI | No |
| `generation-worker` | Generates platform-specific posts via AI | No |
| `stuck-detector` | Resets stuck queue jobs on an interval | No |

Workers communicate with the API indirectly through **Supabase Realtime** — the API subscribes to `generation_queue` row changes and pushes updates to connected clients via SSE.

---

## Tech Stack

**Frontend**
- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, Radix UI, Framer Motion
- Supabase SSR (auth + data)
- DodoPayments (billing)
- Sentry (error tracking)

**Backend**
- Node.js 20, Express 5, TypeScript (ESM)
- Supabase (database + auth + realtime)
- pg-boss (PostgreSQL-backed job queue)
- Google Gemini + Anthropic Claude (AI generation)
- Transcript.com API (YouTube transcript extraction)
- Resend (transactional email)
- Sentry (error tracking)

**Infrastructure**
- Railway (hosting — all services)
- Supabase (managed Postgres + auth + storage)
- Nixpacks (build system)

---

## Project Structure

```
backend/src/
├── app.ts                  # Express app setup, routes, middleware
├── server.ts               # Entry point — starts HTTP server + queue
├── config/                 # Env config, validation, DB pool
├── lib/                    # Logger, Sentry, Supabase client
├── middleware/             # Auth, rate limiting, error handling, CORS
├── modules/
│   ├── video/              # POST /api/v1/yt — submit YouTube URL
│   ├── jobs/               # GET /api/v1/jobs — job status + health
│   ├── notifications/      # GET /api/v1/notifications/sse
│   ├── db/                 # Payload + transcript DB helpers
│   ├── external/           # Transcript.com API client
│   └── storage/            # Supabase storage helpers
├── queue/                  # pg-boss queue manager + job management
├── services/
│   ├── ai/                 # Gemini + Claude clients, AI service
│   └── credits/            # Credit enforcement + ledger
├── notifications/          # SSE server, email client
├── worker/
│   ├── TranscriptWorker.ts
│   ├── GenerationWorker.ts
│   ├── run-transcript-worker.ts   # Worker entry point
│   ├── run-generation-worker.ts   # Worker entry point
│   ├── run-stuck-detector.ts      # Stuck job detector entry point
│   └── health-server.ts           # Minimal HTTP health check for Railway
└── utils/                  # env.ts, user helpers

frontend/src/
├── app/
│   ├── (public)/           # Marketing pages, auth, checkout
│   ├── (private)/          # Dashboard (auth-gated)
│   └── api/                # Next.js API routes (proxy to backend)
├── components/             # UI components, layout, sections
├── hooks/                  # useJobNotifications, useJobStatus, etc.
├── server/                 # Supabase server clients
├── store/                  # Zustand auth store
└── constants/              # Plans, emails

packages/shared/src/
├── types.ts                # Shared domain types (Platforms, UserTone, etc.)
├── constants.ts            # Shared constants
└── plans.ts                # Subscription plan definitions
```

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI (`npm install -g supabase`)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local Supabase

```bash
supabase start
```

This starts a local Postgres instance on port `54322` and the Supabase API on `54321`.

### 3. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env.local
# Fill in values — local Supabase keys are printed by `supabase start`

# Frontend
cp frontend/.env.example frontend/.env.local
# Fill in values
```

### 4. Run migrations

```bash
supabase db push
```

### 5. Start services

```bash
# Terminal 1 — Backend API
pnpm dev:backend

# Terminal 2 — Frontend
pnpm dev:frontend

# Terminal 3 — Transcript worker (optional for local testing)
pnpm --filter backend transcript-worker

# Terminal 4 — Generation worker (optional for local testing)
pnpm --filter backend generation-worker
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:3000` (different ports — check your `.env.local`).

---

## Environment Variables

### Backend (`backend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | HTTP port (default: 3000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (for pg-boss) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `TRANSCRIPT_COM_API` | Yes | Transcript.com API key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `CLAUDE_API_KEY` | Yes | Anthropic Claude API key |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |
| `FRONTEND_URL` | No | Frontend origin for CORS (default: `http://localhost:3001`) |
| `AI_DEFAULT_MODEL` | No | `gemini` or `claude` (default: `gemini`) |
| `GEMINI_MODEL` | No | Model name (default: `gemini-2.5-flash`) |
| `CLAUDE_MODEL` | No | Model name (default: `claude-3-5-sonnet-20241022`) |
| `PGBOSS_SCHEMA` | No | pg-boss DB schema (default: `pgboss`) |
| `EMAIL_ENABLED` | No | Enable email notifications (default: `false`) |

See `backend/.env.example` for the full list with defaults.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `BACKEND_URL` | Yes | Backend API URL (server-only, never exposed to browser) |
| `DODO_PAYMENTS_API_KEY` | Yes | DodoPayments API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Yes | DodoPayments webhook signing key |
| `DODO_PAYMENTS_RETURN_URL` | Yes | Post-checkout redirect URL |
| `DODO_PAYMENTS_ENV` | Yes | `live_mode` or `test_mode` |
| `NEXT_PUBLIC_DODO_PRO_PRODUCT_ID` | Yes | DodoPayments Pro product ID |
| `RESEND_API_KEY` | Yes | Resend API key (for refund request emails) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN (client-side) |
| `SENTRY_DSN` | No | Sentry DSN (server-side) |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | No | Email domain (default: `creatorjot.com`) |

---

## Deploying to Railway

### How it works

All 5 services deploy from the **same GitHub repository**. Railway runs `nixpacks.toml` at the repo root which handles two things:

1. **Install phase** — runs `pnpm install --frozen-lockfile` to install all workspace dependencies
2. **Build phase** — runs `pnpm build:shared` to compile `@creatorjot/shared` into `dist/`

After that, each service runs its own build command set in the Railway dashboard. Because nixpacks runs before the service build command, `@creatorjot/shared` is always compiled and available when the backend or frontend tries to import it.

The `pnpm-lock.yaml` must be committed — Railway uses `--frozen-lockfile` during install.

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository

### Step 2 — Create services

Create **5 services** in Railway, all pointing to the same repo. For each service:

**Root Directory:** `/` (repo root — do not change this)

Configure each service as follows:

#### Frontend

| Setting | Value |
|---|---|
| Build Command | `pnpm --filter frontend build` |
| Start Command | `pnpm --filter frontend start` |
| Health Check Path | `/` |
| Public Domain | Yes |

#### API

| Setting | Value |
|---|---|
| Build Command | `pnpm --filter backend build` |
| Start Command | `node backend/dist/server.js` |
| Health Check Path | `/api/v1/health` |
| Public Domain | Yes |

#### Transcript Worker

| Setting | Value |
|---|---|
| Build Command | `pnpm --filter backend build` |
| Start Command | `node backend/dist/worker/run-transcript-worker.js` |
| Health Check Path | `/health` |
| Public Domain | No |

#### Generation Worker

| Setting | Value |
|---|---|
| Build Command | `pnpm --filter backend build` |
| Start Command | `node backend/dist/worker/run-generation-worker.js` |
| Health Check Path | `/health` |
| Public Domain | No |

#### Stuck Detector

| Setting | Value |
|---|---|
| Build Command | `pnpm --filter backend build` |
| Start Command | `node backend/dist/worker/run-stuck-detector.js` |
| Health Check Path | `/health` |
| Public Domain | No |

> `pnpm build:shared` is a root-level script defined in `package.json` that runs `pnpm --filter @creatorjot/shared build`. The filter uses the package `name` field (`@creatorjot/shared`), not the folder name.

### Step 3 — Set environment variables

Set these variables in the Railway dashboard for each service. Variables marked **shared** should be set on all backend services (api + all workers).

**Shared (all backend services):**

```
DATABASE_URL=<your-supabase-direct-connection-string>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
TRANSCRIPT_COM_API=<your-transcript-api-key>
GEMINI_API_KEY=<your-gemini-api-key>
CLAUDE_API_KEY=<your-claude-api-key>
RESEND_API_KEY=<your-resend-api-key>
SENTRY_DSN=<your-sentry-dsn>
FRONTEND_URL=https://creatorjot.com
NODE_ENV=production
```

**API service only:**

```
SERVICE_TYPE=api
LOG_LEVEL=info
```

**Worker services only:**

```
SERVICE_TYPE=transcript-worker   # or generation-worker / stuck-detector
LOG_LEVEL=info
```

**Frontend service:**

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
BACKEND_URL=https://<your-api-service>.up.railway.app
DODO_PAYMENTS_API_KEY=<your-dodo-api-key>
DODO_PAYMENTS_WEBHOOK_KEY=<your-dodo-webhook-key>
DODO_PAYMENTS_RETURN_URL=https://creatorjot.com/checkout/return
DODO_PAYMENTS_ENV=live_mode
NEXT_PUBLIC_DODO_PRO_PRODUCT_ID=<your-product-id>
RESEND_API_KEY=<your-resend-api-key>
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_EMAIL_DOMAIN=creatorjot.com
NODE_ENV=production
```

> **Note:** `DATABASE_URL` must be the **direct connection string** (not the pooler URL) because pg-boss requires a persistent connection. In Supabase, find it under Project Settings → Database → Connection string → URI (port 5432, not 6543).

### Step 4 — Deploy order

Deploy in this order to avoid health check failures:

1. **API** — must be up before workers try to connect to the queue
2. **Transcript Worker**
3. **Generation Worker**
4. **Stuck Detector**
5. **Frontend** — set `BACKEND_URL` to the API's Railway domain before deploying

### Step 5 — Verify

After all services are running:

- `https://<api>.up.railway.app/api/v1/health` should return `{"status":"healthy",...}`
- `https://<frontend>.up.railway.app` should load the homepage
- Submit a YouTube URL from the dashboard and confirm a generation completes

---

## API Routes

All routes are prefixed with `/api/v1`. Auth is required unless noted.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Simple health check |
| `GET` | `/api/v1/health` | No | Detailed health check with queue stats |
| `POST` | `/api/v1/yt` | Yes | Submit YouTube URL for processing |
| `GET` | `/api/v1/yt/hooks/:ytId` | Yes | Get post angles (hooks) for a video |
| `GET` | `/api/v1/jobs/:jobId` | Yes | Get job status |
| `DELETE` | `/api/v1/jobs/:jobId` | Yes | Cancel a job |
| `GET` | `/api/v1/notifications/sse` | Yes | SSE stream for real-time job updates |

---

## Queue System

CreatorJot uses **pg-boss** — a PostgreSQL-backed job queue. Jobs are stored in the `pgboss` schema in your Supabase database.

### Job flow

```
POST /api/v1/yt
    │
    ├─ Transcript cached? ──Yes──► Enqueue generation jobs directly
    │
    └─ No ──► Enqueue transcript job
                    │
                    ▼
            TranscriptWorker
            - Fetches transcript from Transcript.com
            - Runs Gemini to extract rich_context (hooks, angles, summary)
            - Saves to transcript table
            - Enqueues generation jobs
                    │
                    ▼
            GenerationWorker (one per platform)
            - Reads rich_context from DB
            - Resolves post angle (selected hook or highest-score auto)
            - Calls Claude/Gemini to generate content
            - Saves to generations table
            - Sends SSE notification to connected client
```

### Worker health ports

Each worker runs a minimal HTTP server for Railway health checks:

| Worker | Default Port |
|---|---|
| transcript-worker | 3002 |
| generation-worker | 3003 |
| stuck-detector | 3004 |

On Railway, `PORT` is injected automatically and overrides these defaults.

### Stuck job detection

The `stuck-detector` service runs on an interval (default: 60 seconds) and resets any jobs that have been in `processing` status longer than `QUEUE_STUCK_JOB_TIMEOUT_MINUTES` (default: 5 minutes). Jobs that exceed `QUEUE_MAX_ATTEMPTS` are marked `failed` permanently.
